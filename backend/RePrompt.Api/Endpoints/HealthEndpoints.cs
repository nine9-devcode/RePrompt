using Microsoft.EntityFrameworkCore;
using RePrompt.Api.Data;

namespace RePrompt.Api.Endpoints;

public static class HealthEndpoints
{
    public static RouteGroupBuilder MapHealthEndpoints(this RouteGroupBuilder group)
    {
        // Backs the status indicator in the footer. It actually opens the database rather
        // than just answering "the process is up", so a reachable API with an unreadable
        // database still reports unhealthy.
        group.MapGet("/health", async (AppDbContext db, CancellationToken cancellationToken) =>
        {
            var databaseReachable = await db.Database.CanConnectAsync(cancellationToken);

            var payload = new
            {
                status = databaseReachable ? "healthy" : "degraded",
                database = db.Database.ProviderName?.Split('.').LastOrDefault() ?? "unknown",
                databaseReachable,
            };

            return databaseReachable
                ? Results.Ok(payload)
                : Results.Json(payload, statusCode: StatusCodes.Status503ServiceUnavailable);
        });

        return group;
    }
}
