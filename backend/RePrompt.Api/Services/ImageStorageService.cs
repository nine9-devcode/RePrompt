namespace RePrompt.Api.Services;

public sealed record ImageSaveResult(bool Success, string? Url, string? Error)
{
    public static ImageSaveResult Fail(string error) => new(false, null, error);
    public static ImageSaveResult Ok(string url) => new(true, url, null);
}

/// <summary>
/// Owns every filesystem operation for uploaded images. Nothing outside this class
/// should build a path from a client-supplied value.
/// </summary>
public sealed class ImageStorageService
{
    public const string RequestPath = "/uploads";
    public const long MaxFileSizeBytes = 50L * 1024 * 1024;

    private static readonly string[] AllowedExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

    private static ReadOnlySpan<byte> PngSignature => [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    private readonly ILogger<ImageStorageService> _logger;

    public string UploadsDirectory { get; }

    public ImageStorageService(IWebHostEnvironment env, ILogger<ImageStorageService> logger)
    {
        _logger = logger;

        // WebRootPath is null when wwwroot/ does not exist, which is the case on a fresh
        // clone because the uploads folder is gitignored. Fall back and create it.
        var webRoot = string.IsNullOrEmpty(env.WebRootPath)
            ? Path.Combine(env.ContentRootPath, "wwwroot")
            : env.WebRootPath;

        UploadsDirectory = Path.GetFullPath(Path.Combine(webRoot, "uploads"));
        Directory.CreateDirectory(UploadsDirectory);
    }

    public async Task<ImageSaveResult> SaveAsync(IFormFile? file, CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
            return ImageSaveResult.Fail("No file uploaded.");

        if (file.Length > MaxFileSizeBytes)
            return ImageSaveResult.Fail($"File too large (max {MaxFileSizeBytes / (1024 * 1024)}MB).");

        await using var source = file.OpenReadStream();

        // The format is decided by the file's own header. Content-Type and FileName are
        // both supplied by the client, so neither is trusted and neither is stored.
        var header = new byte[12];
        var headerLength = await source.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, cancellationToken);

        var extension = DetectExtension(header.AsSpan(0, headerLength));
        if (extension is null)
            return ImageSaveResult.Fail("Only PNG, JPEG, WebP and GIF images are allowed.");

        // The stored name is generated entirely server-side; the original name never
        // reaches the filesystem, so it cannot smuggle in an extension or a path.
        var storedName = $"{Guid.NewGuid():N}{extension}";
        var destination = Path.Combine(UploadsDirectory, storedName);

        try
        {
            await using var target = new FileStream(destination, FileMode.CreateNew, FileAccess.Write, FileShare.None);

            if (source.CanSeek)
            {
                source.Position = 0;
            }
            else
            {
                await target.WriteAsync(header.AsMemory(0, headerLength), cancellationToken);
            }

            await source.CopyToAsync(target, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to write uploaded image to {Destination}", destination);
            TryDeletePath(destination);
            return ImageSaveResult.Fail("Failed to store the uploaded image.");
        }

        return ImageSaveResult.Ok($"{RequestPath}/{storedName}");
    }

    /// <summary>
    /// Maps a stored image URL to an absolute path, refusing anything that is not a plain
    /// file name directly inside the uploads folder.
    /// </summary>
    public bool TryResolveStoredFile(string? imageUrl, out string fullPath)
    {
        fullPath = string.Empty;

        if (string.IsNullOrWhiteSpace(imageUrl))
            return false;

        const string prefix = RequestPath + "/";
        if (!imageUrl.StartsWith(prefix, StringComparison.Ordinal))
            return false;

        var fileName = imageUrl[prefix.Length..];
        if (fileName.Length == 0)
            return false;

        // Reject separators, traversal segments and anything the OS considers invalid.
        // Path.Combine would otherwise happily accept "../../x" or an absolute path and
        // silently discard the uploads directory.
        if (fileName.Contains('/') || fileName.Contains('\\'))
            return false;
        if (fileName is "." or "..")
            return false;
        if (fileName != Path.GetFileName(fileName))
            return false;
        if (fileName.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
            return false;

        if (!AllowedExtensions.Contains(Path.GetExtension(fileName), StringComparer.OrdinalIgnoreCase))
            return false;

        // Final defence: canonicalize, then confirm the result is still inside uploads.
        var candidate = Path.GetFullPath(Path.Combine(UploadsDirectory, fileName));
        if (!candidate.StartsWith(UploadsDirectory + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            return false;

        fullPath = candidate;
        return true;
    }

    public bool IsValidImageUrl(string? imageUrl) => TryResolveStoredFile(imageUrl, out _);

    public void DeleteIfExists(string? imageUrl)
    {
        if (!TryResolveStoredFile(imageUrl, out var fullPath))
        {
            _logger.LogWarning("Refused to delete image: {ImageUrl} is not a valid uploads path.", imageUrl);
            return;
        }

        TryDeletePath(fullPath);
    }

    private void TryDeletePath(string fullPath)
    {
        try
        {
            if (File.Exists(fullPath))
                File.Delete(fullPath);
        }
        catch (Exception ex)
        {
            // An orphaned file is not worth failing the request over, but it must be visible.
            _logger.LogWarning(ex, "Failed to delete image file {Path}", fullPath);
        }
    }

    private static string? DetectExtension(ReadOnlySpan<byte> header)
    {
        if (header.Length >= 8 && header[..8].SequenceEqual(PngSignature))
            return ".png";

        if (header.Length >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
            return ".jpg";

        if (header.Length >= 6 && (header[..6].SequenceEqual("GIF87a"u8) || header[..6].SequenceEqual("GIF89a"u8)))
            return ".gif";

        if (header.Length >= 12 && header[..4].SequenceEqual("RIFF"u8) && header[8..12].SequenceEqual("WEBP"u8))
            return ".webp";

        return null;
    }
}
