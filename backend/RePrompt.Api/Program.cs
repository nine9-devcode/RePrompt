using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RePrompt.Api.Data;
using RePrompt.Api.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseStaticFiles(); // Enable serving files from wwwroot
app.UseCors("AllowAngular");

// API Endpoints
var api = app.MapGroup("/api");

// POST: Upload Image
api.MapPost("/upload", async (IFormFile file, IWebHostEnvironment env) =>
{
    if (file == null || file.Length == 0)
        return Results.BadRequest("No file uploaded.");

    // Validate file size (max 50MB)
    const long MaxFileSize = 50 * 1024 * 1024;
    if (file.Length > MaxFileSize)
        return Results.BadRequest("File too large (max 50MB).");

    // Validate MIME type
    var AllowedTypes = new[] { "image/png", "image/jpeg", "image/webp", "image/gif" };
    if (!AllowedTypes.Contains(file.ContentType))
        return Results.BadRequest("Only image files are allowed (PNG, JPEG, WebP, GIF).");

    var uploadsFolder = Path.Combine(env.WebRootPath, "uploads");
    if (!Directory.Exists(uploadsFolder))
        Directory.CreateDirectory(uploadsFolder);

    // Sanitize filename to prevent path traversal attacks
    var safeFileName = Path.GetFileName(file.FileName);
    var uniqueFileName = $"{Guid.NewGuid()}_{safeFileName}";
    var filePath = Path.Combine(uploadsFolder, uniqueFileName);

    using (var stream = new FileStream(filePath, FileMode.Create))
    {
        await file.CopyToAsync(stream);
    }

    var fileUrl = $"/uploads/{uniqueFileName}";
    return Results.Ok(new { url = fileUrl });
}).DisableAntiforgery(); // Disable for simple API uploads

// GET: List all prompts (Paginated & Filtered)
api.MapGet("/prompts", async (
    AppDbContext db,
    [FromQuery] string? search,
    [FromQuery] string? category,
    [FromQuery] string? model,
    [FromQuery] int limit = 20,
    [FromQuery] int offset = 0) =>
{
    var query = db.Prompts
        .AsNoTracking()
        .Include(p => p.Images)
        .AsQueryable();

    // Apply Filters
    if (!string.IsNullOrEmpty(search))
        query = query.Where(p => p.Title.Contains(search));

    if (!string.IsNullOrEmpty(category))
        query = query.Where(p => p.Category == category);

    if (!string.IsNullOrEmpty(model))
        query = query.Where(p => p.ModelName == model);

    // Get Total Count before pagination
    var totalCount = await query.CountAsync();

    // Apply Pagination & Sorting (Latest first)
    var prompts = await query
        .OrderByDescending(p => p.CreatedAt)
        .Skip(offset)
        .Take(limit)
        .ToListAsync();

    return Results.Ok(new { TotalCount = totalCount, Prompts = prompts });
});


// GET: Single Prompt
api.MapGet("/prompts/{id}", async (int id, AppDbContext db) =>
    await db.Prompts
        .AsNoTracking()
        .Include(p => p.Images)
        .FirstOrDefaultAsync(p => p.Id == id)
        is Prompt prompt ? Results.Ok(prompt) : Results.NotFound());

// GET: Autocomplete Suggestions
api.MapGet("/suggestions", async (AppDbContext db) =>
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

    return Results.Ok(new { 
        models, 
        samplers, 
        categories 
    });
});

// POST: Create Prompt
api.MapPost("/prompts", async (Prompt prompt, AppDbContext db) =>
{
    db.Prompts.Add(prompt);
    await db.SaveChangesAsync();
    return Results.Created($"/api/prompts/{prompt.Id}", prompt);
});

// PUT: Update Prompt
api.MapPut("/prompts/{id}", async (int id, Prompt updatedPrompt, AppDbContext db, IWebHostEnvironment env) =>
{
    var existingPrompt = await db.Prompts.Include(p => p.Images).FirstOrDefaultAsync(p => p.Id == id);
    if (existingPrompt == null) return Results.NotFound();

    // Update metadata
    existingPrompt.Title = updatedPrompt.Title;
    existingPrompt.Category = updatedPrompt.Category;
    existingPrompt.IsNsfw = updatedPrompt.IsNsfw;
    existingPrompt.PositivePrompt = updatedPrompt.PositivePrompt;
    existingPrompt.NegativePrompt = updatedPrompt.NegativePrompt;
    existingPrompt.ModelName = updatedPrompt.ModelName;
    existingPrompt.Sampler = updatedPrompt.Sampler;
    existingPrompt.Steps = updatedPrompt.Steps;
    existingPrompt.CFGScale = updatedPrompt.CFGScale;
    existingPrompt.Seed = updatedPrompt.Seed;
    existingPrompt.CreatedAt = updatedPrompt.CreatedAt;

    // Handle Image Update if provided
    var filesToDelete = new List<string>();
    if (updatedPrompt.Images != null && updatedPrompt.Images.Count > 0)
    {
        var newImage = updatedPrompt.Images.First();
        // Only update if the URL has actually changed
        if (!existingPrompt.Images.Any(img => img.ImageUrl == newImage.ImageUrl))
        {
            // Optional: Cache old physical files to delete later on success
            foreach (var img in existingPrompt.Images)
            {
                var oldPath = Path.Combine(env.WebRootPath, img.ImageUrl.TrimStart('/'));
                filesToDelete.Add(oldPath);
            }
            
            existingPrompt.Images.Clear();
            existingPrompt.Images.Add(new RePrompt.Api.Models.Image { ImageUrl = newImage.ImageUrl });
        }
    }

    await db.SaveChangesAsync();

    // Delete cached old files only after DB save succeeds
    foreach (var oldPath in filesToDelete)
    {
        if (System.IO.File.Exists(oldPath))
        {
            try { System.IO.File.Delete(oldPath); } catch { /* Log or ignore */ }
        }
    }

    return Results.Ok(existingPrompt);
});

// DELETE: Remove Prompt
api.MapDelete("/prompts/{id}", async (int id, AppDbContext db, IWebHostEnvironment env) =>
{
    var prompt = await db.Prompts.Include(p => p.Images).FirstOrDefaultAsync(p => p.Id == id);
    if (prompt != null)
    {
        // 1. Gather physical file paths to delete later
        var filesToDelete = prompt.Images
            .Select(image => Path.Combine(env.WebRootPath, image.ImageUrl.TrimStart('/')))
            .ToList();

        // 2. Remove database entries first
        db.Prompts.Remove(prompt);
        await db.SaveChangesAsync();

        // 3. Delete physical files from disk only on success
        foreach (var filePath in filesToDelete)
        {
            if (System.IO.File.Exists(filePath))
            {
                try { System.IO.File.Delete(filePath); } catch { /* Log or ignore */ }
            }
        }
        return Results.NoContent();
    }
    return Results.NotFound();
});

// DELETE: Single Image
api.MapDelete("/images/{id}", async (int id, AppDbContext db, IWebHostEnvironment env) =>
{
    var image = await db.Images.FindAsync(id);
    if (image != null)
    {
        // 1. Store the file path
        var filePath = Path.Combine(env.WebRootPath, image.ImageUrl.TrimStart('/'));

        // 2. Remove record from database first
        db.Images.Remove(image);
        await db.SaveChangesAsync();

        // 3. Delete physical file from disk only on success
        if (System.IO.File.Exists(filePath))
        {
            try { System.IO.File.Delete(filePath); } catch { /* Log or ignore */ }
        }
        return Results.NoContent();
    }
    return Results.NotFound();
});

app.Run();
