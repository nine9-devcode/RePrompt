using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using RePrompt.Api.Data;
using RePrompt.Api.Endpoints;
using RePrompt.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddSingleton<ImageStorageService>();
builder.Services.AddHostedService<ThumbnailBackfillService>();

// Turns unhandled exceptions and bare status codes into RFC 7807 responses instead of
// raw 500s, so the Angular client always gets a parseable error body.
builder.Services.AddProblemDetails();

builder.Services.AddOpenApi();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                     ?? ["http://localhost:4200"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Kestrel's default request body cap (~28MB) is below the upload limit, so a large but
// legal image would be rejected with a 413 before the handler ever ran.
const long MaxRequestBodyBytes = ImageStorageService.MaxFileSizeBytes + (1024 * 1024);
builder.Services.Configure<FormOptions>(options => options.MultipartBodyLengthLimit = MaxRequestBodyBytes);
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = MaxRequestBodyBytes);

var app = builder.Build();

// A fresh clone has no database file at all. Applying migrations at startup means
// `dotnet run` works without a manual `dotnet ef database update`.
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

// BadHttpRequestException already carries the right status (e.g. 400 for a malformed
// JSON body); without this selector the handler would report all of them as 500.
app.UseExceptionHandler(new ExceptionHandlerOptions
{
    StatusCodeSelector = exception => exception is BadHttpRequestException badRequest
        ? badRequest.StatusCode
        : StatusCodes.Status500InternalServerError
});
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    // Redirecting in development would turn the Angular client's plain-HTTP preflight
    // into a 307 before CORS ever runs.
    app.UseHttpsRedirection();
}

// CORS must run before the endpoints and static files it applies to.
app.UseCors("AllowAngular");

var imageStorage = app.Services.GetRequiredService<ImageStorageService>();

// Serve only the uploads folder, and only as known image types. The previous
// `UseStaticFiles()` exposed all of wwwroot and would happily serve an uploaded
// .html or .svg as active content from the API's own origin.
var uploadContentTypes = new FileExtensionContentTypeProvider(new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
{
    [".png"] = "image/png",
    [".jpg"] = "image/jpeg",
    [".jpeg"] = "image/jpeg",
    [".webp"] = "image/webp",
    [".gif"] = "image/gif",
});

static void HardenImageResponse(StaticFileResponseContext context)
{
    var headers = context.Context.Response.Headers;
    headers.XContentTypeOptions = "nosniff";
    headers.ContentSecurityPolicy = "default-src 'none'; sandbox";
}

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(imageStorage.UploadsDirectory),
    RequestPath = ImageStorageService.RequestPath,
    ContentTypeProvider = uploadContentTypes,
    ServeUnknownFileTypes = false,
    OnPrepareResponse = HardenImageResponse,
});

// Thumbnails are always WebP and are content-addressed by a GUID, so they can be
// cached hard — a given url's bytes never change.
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(imageStorage.ThumbnailsDirectory),
    RequestPath = ImageStorageService.ThumbnailRequestPath,
    ContentTypeProvider = uploadContentTypes,
    ServeUnknownFileTypes = false,
    OnPrepareResponse = context =>
    {
        HardenImageResponse(context);
        context.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
    },
});

var api = app.MapGroup("/api");
api.MapHealthEndpoints();
api.MapPromptEndpoints();
api.MapUploadEndpoints();
api.MapBackupEndpoints();

app.Run();
