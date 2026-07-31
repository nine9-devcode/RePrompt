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
                ? Results.Ok(new { url = result.Url })
                : Results.BadRequest(new { error = result.Error });
        }).DisableAntiforgery();

        return group;
    }
}
