using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RePrompt.Api.Data;
using RePrompt.Api.Dtos;
using RePrompt.Api.Models;
using RePrompt.Api.Services;
using RePrompt.Api.Validation;

namespace RePrompt.Api.Endpoints;

public static class PromptEndpoints
{
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 100;

    public static RouteGroupBuilder MapPromptEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/prompts", GetPrompts);
        group.MapGet("/prompts/{id:int}", GetPrompt);
        group.MapGet("/suggestions", GetSuggestions);
        group.MapPost("/prompts", CreatePrompt);
        group.MapPut("/prompts/{id:int}", UpdatePrompt);
        group.MapDelete("/prompts/{id:int}", DeletePrompt);
        group.MapDelete("/images/{id:int}", DeleteImage);

        return group;
    }

    private static async Task<IResult> GetPrompts(
        AppDbContext db,
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] string? model,
        [FromQuery] bool includeNsfw = true,
        [FromQuery] int limit = DefaultPageSize,
        [FromQuery] int offset = 0)
    {
        // Unclamped paging lets a caller request the whole table in one shot, and a
        // negative offset makes SQLite throw.
        limit = Math.Clamp(limit, 1, MaxPageSize);
        offset = Math.Max(offset, 0);

        var query = db.Prompts
            .AsNoTracking()
            .Include(p => p.Images)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p => p.Title.Contains(search));

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(p => p.Category == category);

        if (!string.IsNullOrWhiteSpace(model))
            query = query.Where(p => p.ModelName == model);

        // Strict mode filters here rather than in the browser, so TotalCount stays
        // consistent with what the client can actually display.
        if (!includeNsfw)
            query = query.Where(p => !p.IsNsfw);

        var totalCount = await query.CountAsync();

        var prompts = await query
            .OrderByDescending(p => p.CreatedAt)
            .ThenByDescending(p => p.Id)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();

        return Results.Ok(new { TotalCount = totalCount, Prompts = prompts });
    }

    private static async Task<IResult> GetPrompt(int id, AppDbContext db)
    {
        var prompt = await db.Prompts
            .AsNoTracking()
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Id == id);

        return prompt is null ? Results.NotFound() : Results.Ok(prompt);
    }

    private static async Task<IResult> GetSuggestions(AppDbContext db)
    {
        var models = await db.Prompts.AsNoTracking()
            .Select(p => p.ModelName)
            .Where(m => !string.IsNullOrEmpty(m))
            .Distinct()
            .ToListAsync();

        var samplers = await db.Prompts.AsNoTracking()
            .Select(p => p.Sampler)
            .Where(s => !string.IsNullOrEmpty(s))
            .Distinct()
            .ToListAsync();

        var categories = await db.Prompts.AsNoTracking()
            .Select(p => p.Category)
            .Where(c => !string.IsNullOrEmpty(c))
            .Distinct()
            .ToListAsync();

        return Results.Ok(new { models, samplers, categories });
    }

    private static async Task<IResult> CreatePrompt(
        PromptRequest request,
        AppDbContext db,
        ImageStorageService storage)
    {
        if (!TryValidateRequest(request, storage, out var problem))
            return problem;

        var prompt = new Prompt { CreatedAt = request.CreatedAt ?? DateTime.UtcNow };
        Apply(request, prompt);

        foreach (var image in request.Images)
            prompt.Images.Add(new Image { ImageUrl = image.ImageUrl });

        db.Prompts.Add(prompt);
        await db.SaveChangesAsync();

        return Results.Created($"/api/prompts/{prompt.Id}", prompt);
    }

    private static async Task<IResult> UpdatePrompt(
        int id,
        PromptRequest request,
        AppDbContext db,
        ImageStorageService storage)
    {
        if (!TryValidateRequest(request, storage, out var problem))
            return problem;

        var prompt = await db.Prompts.Include(p => p.Images).FirstOrDefaultAsync(p => p.Id == id);
        if (prompt is null)
            return Results.NotFound();

        Apply(request, prompt);
        if (request.CreatedAt.HasValue)
            prompt.CreatedAt = request.CreatedAt.Value;

        // Replace the image set only when it actually changed, so an unrelated edit
        // never deletes the file on disk.
        var replacedImageUrls = new List<string>();
        if (request.Images.Count > 0)
        {
            var newUrl = request.Images[0].ImageUrl;

            if (!prompt.Images.Any(img => img.ImageUrl == newUrl))
            {
                replacedImageUrls.AddRange(prompt.Images.Select(img => img.ImageUrl));
                prompt.Images.Clear();
                prompt.Images.Add(new Image { ImageUrl = newUrl });
            }
        }

        await db.SaveChangesAsync();

        // Touch the disk only after the database commit succeeds.
        foreach (var imageUrl in replacedImageUrls)
            storage.DeleteIfExists(imageUrl);

        return Results.Ok(prompt);
    }

    private static async Task<IResult> DeletePrompt(int id, AppDbContext db, ImageStorageService storage)
    {
        var prompt = await db.Prompts.Include(p => p.Images).FirstOrDefaultAsync(p => p.Id == id);
        if (prompt is null)
            return Results.NotFound();

        var imageUrls = prompt.Images.Select(image => image.ImageUrl).ToList();

        db.Prompts.Remove(prompt);
        await db.SaveChangesAsync();

        foreach (var imageUrl in imageUrls)
            storage.DeleteIfExists(imageUrl);

        return Results.NoContent();
    }

    private static async Task<IResult> DeleteImage(int id, AppDbContext db, ImageStorageService storage)
    {
        var image = await db.Images.FindAsync(id);
        if (image is null)
            return Results.NotFound();

        var imageUrl = image.ImageUrl;

        db.Images.Remove(image);
        await db.SaveChangesAsync();

        storage.DeleteIfExists(imageUrl);

        return Results.NoContent();
    }

    private static bool TryValidateRequest(
        PromptRequest request,
        ImageStorageService storage,
        out IResult problem)
    {
        if (!RequestValidator.TryValidate(request, out var errors))
        {
            problem = Results.ValidationProblem(errors);
            return false;
        }

        // ImageUrl ends up on the filesystem during update and delete, so it is checked
        // on the way in rather than trusted later.
        var invalid = request.Images
            .Where(image => !storage.IsValidImageUrl(image.ImageUrl))
            .Select(image => image.ImageUrl)
            .ToArray();

        if (invalid.Length > 0)
        {
            problem = Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["Images"] = [$"Image url must point to an uploaded file under {ImageStorageService.RequestPath}/."]
            });
            return false;
        }

        problem = Results.Empty;
        return true;
    }

    private static void Apply(PromptRequest request, Prompt target)
    {
        target.Title = request.Title.Trim();
        target.PositivePrompt = request.PositivePrompt;
        target.NegativePrompt = request.NegativePrompt;
        target.ModelName = request.ModelName;
        target.Sampler = request.Sampler;
        target.Steps = request.Steps;
        target.CFGScale = request.CFGScale;
        target.Seed = request.Seed;
        target.IsNsfw = request.IsNsfw;
        target.Category = string.IsNullOrWhiteSpace(request.Category) ? "General" : request.Category.Trim();
    }
}
