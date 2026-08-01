using Microsoft.EntityFrameworkCore;
using RePrompt.Api.Data;

namespace RePrompt.Api.Services;

/// <summary>
/// Generates thumbnails and fills in dimensions for images that were uploaded before
/// thumbnails existed. Runs once in the background at startup so it never delays boot,
/// and does nothing on a database that is already up to date.
/// </summary>
public sealed class ThumbnailBackfillService(
    IServiceScopeFactory scopeFactory,
    ImageStorageService storage,
    ILogger<ThumbnailBackfillService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var pending = await db.Images
                .Where(image => image.ThumbnailUrl == null || image.Width == null)
                .ToListAsync(stoppingToken);

            if (pending.Count == 0)
                return;

            logger.LogInformation("Backfilling thumbnails for {Count} image(s).", pending.Count);

            var generated = 0;

            foreach (var image in pending)
            {
                if (stoppingToken.IsCancellationRequested)
                    break;

                if (!storage.TryResolveStoredFile(image.ImageUrl, out var path) || !File.Exists(path))
                {
                    logger.LogWarning("Skipping {ImageUrl}: the file is not on disk.", image.ImageUrl);
                    continue;
                }

                var (thumbnailUrl, width, height) = await storage.CreateThumbnailAsync(
                    Path.GetFileName(path), stoppingToken);

                if (thumbnailUrl is null)
                    continue;

                image.ThumbnailUrl = thumbnailUrl;
                image.Width = width;
                image.Height = height;
                generated++;
            }

            await db.SaveChangesAsync(stoppingToken);
            logger.LogInformation("Thumbnail backfill finished: {Generated} generated.", generated);
        }
        catch (OperationCanceledException)
        {
            // Shutting down mid-backfill is fine; the next start picks up where this left off.
        }
        catch (Exception ex)
        {
            // Never take the app down over a cosmetic background job.
            logger.LogError(ex, "Thumbnail backfill failed.");
        }
    }
}
