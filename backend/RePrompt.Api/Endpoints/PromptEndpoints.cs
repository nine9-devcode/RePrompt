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
        group.MapGet("/tags", GetTags);
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
        [FromQuery] string? tags,
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
            .Include(p => p.Tags)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p => p.Title.Contains(search));

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(p => p.Category == category);

        if (!string.IsNullOrWhiteSpace(model))
            query = query.Where(p => p.ModelName == model);

        // Comma separated, AND semantics: narrowing by several tags is the useful case.
        foreach (var tag in ParseTagNames(tags))
        {
            var required = tag;
            query = query.Where(p => p.Tags.Any(t => t.Name == required));
        }

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

        return Results.Ok(new { TotalCount = totalCount, Prompts = prompts.Select(ToResponse) });
    }

    private static async Task<IResult> GetPrompt(int id, AppDbContext db)
    {
        var prompt = await db.Prompts
            .AsNoTracking()
            .Include(p => p.Images)
            .Include(p => p.Tags)
            .FirstOrDefaultAsync(p => p.Id == id);

        return prompt is null ? Results.NotFound() : Results.Ok(ToResponse(prompt));
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

        var tags = await db.Tags.AsNoTracking()
            .OrderBy(t => t.Name)
            .Select(t => t.Name)
            .ToListAsync();

        return Results.Ok(new { models, samplers, categories, tags });
    }

    /// <summary>Tags with how many prompts use each, most used first.</summary>
    private static async Task<IResult> GetTags(AppDbContext db)
    {
        var tags = await db.Tags.AsNoTracking()
            .Select(t => new { t.Name, Count = t.Prompts.Count })
            .OrderByDescending(t => t.Count)
            .ThenBy(t => t.Name)
            .ToListAsync();

        return Results.Ok(tags);
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
            prompt.Images.Add(BuildImage(image.ImageUrl, storage));

        prompt.Tags.AddRange(await ResolveTagsAsync(request.Tags, db));

        db.Prompts.Add(prompt);
        await db.SaveChangesAsync();

        return Results.Created($"/api/prompts/{prompt.Id}", ToResponse(prompt));
    }

    private static async Task<IResult> UpdatePrompt(
        int id,
        PromptRequest request,
        AppDbContext db,
        ImageStorageService storage)
    {
        if (!TryValidateRequest(request, storage, out var problem))
            return problem;

        var prompt = await db.Prompts
            .Include(p => p.Images)
            .Include(p => p.Tags)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (prompt is null)
            return Results.NotFound();

        Apply(request, prompt);
        if (request.CreatedAt.HasValue)
            prompt.CreatedAt = request.CreatedAt.Value;

        prompt.Tags.Clear();
        prompt.Tags.AddRange(await ResolveTagsAsync(request.Tags, db));

        // Replace the image set only when it actually changed, so an unrelated edit
        // never deletes the file on disk.
        var replaced = new List<Image>();
        if (request.Images.Count > 0)
        {
            var newUrl = request.Images[0].ImageUrl;

            if (!prompt.Images.Any(img => img.ImageUrl == newUrl))
            {
                replaced.AddRange(prompt.Images);
                prompt.Images.Clear();
                prompt.Images.Add(BuildImage(newUrl, storage));
            }
        }

        await db.SaveChangesAsync();

        // Touch the disk only after the database commit succeeds.
        foreach (var image in replaced)
            storage.DeleteIfExists(image.ImageUrl, image.ThumbnailUrl);

        return Results.Ok(ToResponse(prompt));
    }

    private static async Task<IResult> DeletePrompt(int id, AppDbContext db, ImageStorageService storage)
    {
        var prompt = await db.Prompts.Include(p => p.Images).FirstOrDefaultAsync(p => p.Id == id);
        if (prompt is null)
            return Results.NotFound();

        var images = prompt.Images.ToList();

        db.Prompts.Remove(prompt);
        await db.SaveChangesAsync();

        foreach (var image in images)
            storage.DeleteIfExists(image.ImageUrl, image.ThumbnailUrl);

        return Results.NoContent();
    }

    private static async Task<IResult> DeleteImage(int id, AppDbContext db, ImageStorageService storage)
    {
        var image = await db.Images.FindAsync(id);
        if (image is null)
            return Results.NotFound();

        var (imageUrl, thumbnailUrl) = (image.ImageUrl, image.ThumbnailUrl);

        db.Images.Remove(image);
        await db.SaveChangesAsync();

        storage.DeleteIfExists(imageUrl, thumbnailUrl);

        return Results.NoContent();
    }

    /// <summary>
    /// Reuses existing tag rows so the same name never gets duplicated, and creates only
    /// the genuinely new ones.
    /// </summary>
    private static async Task<List<Tag>> ResolveTagsAsync(IEnumerable<string> names, AppDbContext db)
    {
        var normalized = names
            .Select(Tag.Normalize)
            .Where(name => name.Length > 0)
            .Distinct()
            .ToList();

        if (normalized.Count == 0)
            return [];

        var existing = await db.Tags.Where(t => normalized.Contains(t.Name)).ToListAsync();
        var resolved = new List<Tag>(existing);

        foreach (var name in normalized.Except(existing.Select(t => t.Name)))
        {
            var tag = new Tag { Name = name };
            db.Tags.Add(tag);
            resolved.Add(tag);
        }

        return resolved;
    }

    private static Image BuildImage(string imageUrl, ImageStorageService storage)
    {
        // Thumbnail url and dimensions come from disk, never from the request body.
        var (thumbnailUrl, width, height) = storage.DescribeStoredImage(imageUrl);

        return new Image
        {
            ImageUrl = imageUrl,
            ThumbnailUrl = thumbnailUrl,
            Width = width,
            Height = height,
        };
    }

    private static IEnumerable<string> ParseTagNames(string? raw) =>
        string.IsNullOrWhiteSpace(raw)
            ? []
            : raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                 .Select(Tag.Normalize)
                 .Where(name => name.Length > 0)
                 .Distinct();

    /// <summary>Flattens tags to plain names so the client never has to unwrap the join.</summary>
    private static object ToResponse(Prompt prompt) => new
    {
        prompt.Id,
        prompt.Title,
        prompt.PositivePrompt,
        prompt.NegativePrompt,
        prompt.Sampler,
        prompt.Steps,
        prompt.CFGScale,
        prompt.Seed,
        prompt.ModelName,
        prompt.Category,
        prompt.IsNsfw,
        prompt.CreatedAt,
        prompt.Images,
        Tags = prompt.Tags.Select(t => t.Name).OrderBy(name => name).ToList(),
    };

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
            .ToArray();

        if (invalid.Length > 0)
        {
            problem = Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["Images"] = [$"Image url must point to an uploaded file under {ImageStorageService.RequestPath}/."]
            });
            return false;
        }

        var oversized = request.Tags
            .Select(Tag.Normalize)
            .Where(name => name.Length > 50)
            .ToArray();

        if (oversized.Length > 0)
        {
            problem = Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["Tags"] = ["Each tag must be 50 characters or fewer."]
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
