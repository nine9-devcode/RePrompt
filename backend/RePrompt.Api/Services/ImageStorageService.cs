using SkiaSharp;

namespace RePrompt.Api.Services;

public sealed record ImageSaveResult(
    bool Success,
    string? Url,
    string? ThumbnailUrl,
    int? Width,
    int? Height,
    string? Error)
{
    public static ImageSaveResult Fail(string error) => new(false, null, null, null, null, error);

    public static ImageSaveResult Ok(string url, string? thumbnailUrl, int? width, int? height) =>
        new(true, url, thumbnailUrl, width, height, null);
}

/// <summary>
/// Owns every filesystem operation for uploaded images. Nothing outside this class
/// should build a path from a client-supplied value.
/// </summary>
public sealed class ImageStorageService
{
    public const string RequestPath = "/uploads";
    public const string ThumbnailRequestPath = "/thumbnails";
    public const long MaxFileSizeBytes = 50L * 1024 * 1024;

    /// <summary>Long edge of a generated thumbnail. Roughly 2x a gallery column on a HiDPI screen.</summary>
    private const int ThumbnailMaxEdge = 600;

    private static readonly string[] AllowedExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

    private static ReadOnlySpan<byte> PngSignature => [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    private readonly ILogger<ImageStorageService> _logger;

    public string UploadsDirectory { get; }

    public string ThumbnailsDirectory { get; }

    public ImageStorageService(IWebHostEnvironment env, ILogger<ImageStorageService> logger)
    {
        _logger = logger;

        // WebRootPath is null when wwwroot/ does not exist, which is the case on a fresh
        // clone because the uploads folder is gitignored. Fall back and create it.
        var webRoot = string.IsNullOrEmpty(env.WebRootPath)
            ? Path.Combine(env.ContentRootPath, "wwwroot")
            : env.WebRootPath;

        UploadsDirectory = Path.GetFullPath(Path.Combine(webRoot, "uploads"));
        ThumbnailsDirectory = Path.GetFullPath(Path.Combine(webRoot, "thumbnails"));

        Directory.CreateDirectory(UploadsDirectory);
        Directory.CreateDirectory(ThumbnailsDirectory);
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

        var derived = await CreateThumbnailAsync(storedName, cancellationToken);

        return ImageSaveResult.Ok($"{RequestPath}/{storedName}", derived.ThumbnailUrl, derived.Width, derived.Height);
    }

    /// <summary>
    /// Builds the gallery-sized copy and reads the original's dimensions. A failure here is
    /// not fatal — the image is already stored and callers fall back to the full-size file.
    /// </summary>
    public async Task<(string? ThumbnailUrl, int? Width, int? Height)> CreateThumbnailAsync(
        string storedName,
        CancellationToken cancellationToken = default)
    {
        var sourcePath = Path.Combine(UploadsDirectory, storedName);
        if (!File.Exists(sourcePath))
            return (null, null, null);

        var thumbnailName = $"{Path.GetFileNameWithoutExtension(storedName)}.webp";
        var thumbnailPath = Path.Combine(ThumbnailsDirectory, thumbnailName);

        try
        {
            return await Task.Run(() =>
            {
                // Animated sources collapse to their first frame; a still thumbnail is the point.
                using var source = SKBitmap.Decode(sourcePath);
                if (source is null)
                {
                    _logger.LogWarning("Could not decode {StoredName} for thumbnailing.", storedName);
                    return ((string?)null, (int?)null, (int?)null);
                }

                var width = source.Width;
                var height = source.Height;

                // Fit inside the box, preserve aspect ratio, never upscale.
                var scale = Math.Min(1.0, (double)ThumbnailMaxEdge / Math.Max(width, height));
                var targetWidth = Math.Max(1, (int)Math.Round(width * scale));
                var targetHeight = Math.Max(1, (int)Math.Round(height * scale));

                using var resized = source.Resize(
                    new SKImageInfo(targetWidth, targetHeight),
                    new SKSamplingOptions(SKCubicResampler.Mitchell));

                if (resized is null)
                {
                    _logger.LogWarning("Could not resize {StoredName}.", storedName);
                    return (null, null, null);
                }

                using var image = SKImage.FromBitmap(resized);
                using var data = image.Encode(SKEncodedImageFormat.Webp, 80);
                using var output = File.Create(thumbnailPath);
                data.SaveTo(output);

                return ($"{ThumbnailRequestPath}/{thumbnailName}", (int?)width, (int?)height);
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not create a thumbnail for {StoredName}", storedName);
            TryDeletePath(thumbnailPath);
            return (null, null, null);
        }
    }

    /// <summary>
    /// Server-side lookup of an upload's derived data. Callers never accept the thumbnail
    /// url or dimensions from the client — they are read back from disk here so they cannot
    /// be forged. Identify only parses the header, it does not decode the pixels.
    /// </summary>
    public (string? ThumbnailUrl, int? Width, int? Height) DescribeStoredImage(string? imageUrl)
    {
        if (!TryResolveStoredFile(imageUrl, out var imagePath) || !File.Exists(imagePath))
            return (null, null, null);

        var thumbnailName = $"{Path.GetFileNameWithoutExtension(imagePath)}.webp";
        var thumbnailUrl = File.Exists(Path.Combine(ThumbnailsDirectory, thumbnailName))
            ? $"{ThumbnailRequestPath}/{thumbnailName}"
            : null;

        try
        {
            // SKCodec reads the header only; it does not decode the pixels.
            using var codec = SKCodec.Create(imagePath);
            return codec is null
                ? (thumbnailUrl, null, null)
                : (thumbnailUrl, codec.Info.Width, codec.Info.Height);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not read dimensions of {Path}", imagePath);
            return (thumbnailUrl, null, null);
        }
    }

    /// <summary>
    /// Maps a stored image URL to an absolute path, refusing anything that is not a plain
    /// file name directly inside the uploads folder.
    /// </summary>
    public bool TryResolveStoredFile(string? imageUrl, out string fullPath) =>
        TryResolve(imageUrl, RequestPath, UploadsDirectory, AllowedExtensions, out fullPath);

    public bool IsValidImageUrl(string? imageUrl) => TryResolveStoredFile(imageUrl, out _);

    public bool TryResolveThumbnail(string? thumbnailUrl, out string fullPath) =>
        TryResolve(thumbnailUrl, ThumbnailRequestPath, ThumbnailsDirectory, [".webp"], out fullPath);

    private bool TryResolve(
        string? url,
        string requestPath,
        string directory,
        string[] allowedExtensions,
        out string fullPath)
    {
        fullPath = string.Empty;

        if (string.IsNullOrWhiteSpace(url))
            return false;

        var prefix = requestPath + "/";
        if (!url.StartsWith(prefix, StringComparison.Ordinal))
            return false;

        var fileName = url[prefix.Length..];
        if (fileName.Length == 0)
            return false;

        // Reject separators, traversal segments and anything the OS considers invalid.
        // Path.Combine would otherwise happily accept "../../x" or an absolute path and
        // silently discard the target directory.
        if (fileName.Contains('/') || fileName.Contains('\\'))
            return false;
        if (fileName is "." or "..")
            return false;
        if (fileName != Path.GetFileName(fileName))
            return false;
        if (fileName.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
            return false;

        if (!allowedExtensions.Contains(Path.GetExtension(fileName), StringComparer.OrdinalIgnoreCase))
            return false;

        // Final defence: canonicalize, then confirm the result is still inside the folder.
        var candidate = Path.GetFullPath(Path.Combine(directory, fileName));
        if (!candidate.StartsWith(directory + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            return false;

        fullPath = candidate;
        return true;
    }

    /// <summary>Removes an upload and, when given, its generated thumbnail.</summary>
    public void DeleteIfExists(string? imageUrl, string? thumbnailUrl = null)
    {
        if (TryResolveStoredFile(imageUrl, out var imagePath))
        {
            TryDeletePath(imagePath);
        }
        else
        {
            _logger.LogWarning("Refused to delete image: {ImageUrl} is not a valid uploads path.", imageUrl);
        }

        if (thumbnailUrl is null)
            return;

        if (TryResolveThumbnail(thumbnailUrl, out var thumbnailPath))
        {
            TryDeletePath(thumbnailPath);
        }
        else
        {
            _logger.LogWarning("Refused to delete thumbnail: {ThumbnailUrl} is not a valid thumbnails path.", thumbnailUrl);
        }
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
            _logger.LogWarning(ex, "Failed to delete file {Path}", fullPath);
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
