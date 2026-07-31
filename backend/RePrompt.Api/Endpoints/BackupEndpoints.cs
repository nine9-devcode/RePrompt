using System.Globalization;
using System.IO.Compression;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using RePrompt.Api.Data;
using RePrompt.Api.Services;

namespace RePrompt.Api.Endpoints;

public static class BackupEndpoints
{
    private const int SchemaVersion = 1;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    public static RouteGroupBuilder MapBackupEndpoints(this RouteGroupBuilder group)
    {
        // Everything lives in one gitignored SQLite file plus a folder of images, and the
        // WAL means copying reprompt.db alone can silently lose recent writes. This streams
        // both out as a single zip.
        group.MapGet("/export", async (
            AppDbContext db,
            ImageStorageService storage,
            ILogger<Marker> logger,
            CancellationToken cancellationToken) =>
        {
            var prompts = await db.Prompts
                .AsNoTracking()
                .Include(p => p.Images)
                .OrderBy(p => p.Id)
                .ToListAsync(cancellationToken);

            var manifest = new ExportManifest(
                SchemaVersion,
                DateTime.UtcNow,
                prompts.Count,
                prompts.Select(p => new ExportedPrompt(
                    p.Id, p.Title, p.PositivePrompt, p.NegativePrompt, p.Sampler, p.Steps,
                    p.CFGScale, p.Seed, p.ModelName, p.Category, p.IsNsfw, p.CreatedAt,
                    p.Images.Select(i => i.ImageUrl).ToList())).ToList());

            // InvariantCulture matters here: on a Thai system the default calendar renders
            // the year as 2569 rather than 2026.
            var fileName = $"reprompt-backup-{DateTime.UtcNow.ToString("yyyyMMdd-HHmmss", CultureInfo.InvariantCulture)}.zip";

            // Built into a temp file rather than straight onto the response body: the zip
            // central directory is only written on dispose, and a large library should never
            // have to fit in memory. DeleteOnClose removes it once the response is sent.
            var tempPath = Path.Combine(Path.GetTempPath(), $"reprompt-export-{Guid.NewGuid():N}.zip");
            var missing = 0;

            try
            {
                await using (var tempFile = File.Create(tempPath))
                using (var archive = new ZipArchive(tempFile, ZipArchiveMode.Create))
                {
                    var manifestEntry = archive.CreateEntry("prompts.json", CompressionLevel.Optimal);
                    await using (var manifestStream = manifestEntry.Open())
                    {
                        await JsonSerializer.SerializeAsync(manifestStream, manifest, JsonOptions, cancellationToken);
                    }

                    var imageUrls = prompts.SelectMany(p => p.Images).Select(i => i.ImageUrl).Distinct();

                    foreach (var imageUrl in imageUrls)
                    {
                        if (!storage.TryResolveStoredFile(imageUrl, out var path) || !File.Exists(path))
                        {
                            missing++;
                            logger.LogWarning("Export skipped {ImageUrl}: file is not on disk.", imageUrl);
                            continue;
                        }

                        // Already-compressed formats, so recompressing only costs time.
                        var entry = archive.CreateEntry($"images/{Path.GetFileName(path)}", CompressionLevel.NoCompression);
                        await using var target = entry.Open();
                        await using var source = File.OpenRead(path);
                        await source.CopyToAsync(target, cancellationToken);
                    }
                }
            }
            catch
            {
                if (File.Exists(tempPath)) File.Delete(tempPath);
                throw;
            }

            logger.LogInformation("Exported {PromptCount} prompts ({Missing} image(s) missing).", prompts.Count, missing);

            var download = new FileStream(
                tempPath, FileMode.Open, FileAccess.Read, FileShare.None,
                bufferSize: 81920, FileOptions.DeleteOnClose | FileOptions.Asynchronous);

            return Results.File(download, "application/zip", fileName);
        });

        return group;
    }

    /// <summary>Only used to give the export endpoint a typed logger category.</summary>
    private sealed class Marker;

    private sealed record ExportManifest(
        int SchemaVersion,
        DateTime ExportedAt,
        int PromptCount,
        IReadOnlyList<ExportedPrompt> Prompts);

    private sealed record ExportedPrompt(
        int Id,
        string Title,
        string PositivePrompt,
        string? NegativePrompt,
        string? Sampler,
        int Steps,
        float CFGScale,
        string? Seed,
        string? ModelName,
        string Category,
        bool IsNsfw,
        DateTime CreatedAt,
        IReadOnlyList<string> Images);
}
