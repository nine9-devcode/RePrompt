using Microsoft.EntityFrameworkCore;
using RePrompt.Api.Data;
using RePrompt.Api.Services;

namespace RePrompt.Api.Endpoints;

public static class UploadEndpoints
{
    public static RouteGroupBuilder MapUploadEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/upload", async (
            IFormFile? file,
            ImageStorageService storage,
            CancellationToken cancellationToken) =>
        {
            var result = await storage.SaveAsync(file, cancellationToken);

            return result.Success
                ? Results.Ok(new
                {
                    url = result.Url,
                    thumbnailUrl = result.ThumbnailUrl,
                    width = result.Width,
                    height = result.Height,
                })
                : Results.BadRequest(new { error = result.Error });
        }).DisableAntiforgery();

        // The client uploads before it saves the prompt, so a failed save would otherwise
        // leave the file on disk forever with nothing referencing it.
        group.MapDelete("/uploads/{fileName}", async (
            string fileName,
            AppDbContext db,
            ImageStorageService storage) =>
        {
            var imageUrl = $"{ImageStorageService.RequestPath}/{fileName}";

            if (!storage.IsValidImageUrl(imageUrl))
                return Results.BadRequest(new { error = "Invalid upload file name." });

            // Only ever discard files nothing points at, so this cannot be used to delete
            // an image that belongs to a saved prompt.
            if (await db.Images.AnyAsync(image => image.ImageUrl == imageUrl))
                return Results.Conflict(new { error = "This upload belongs to a saved prompt." });

            var (thumbnailUrl, _, _) = storage.DescribeStoredImage(imageUrl);
            storage.DeleteIfExists(imageUrl, thumbnailUrl);
            return Results.NoContent();
        });

        return group;
    }
}
