using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using RePrompt.Api.Services;
using SkiaSharp;
using Xunit;

namespace RePrompt.Api.Tests;

public sealed class ThumbnailTests : IDisposable
{
    private readonly string _root;
    private readonly ImageStorageService _storage;

    public ThumbnailTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "reprompt-thumb-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_root);
        _storage = new ImageStorageService(new FakeEnvironment(_root), NullLogger<ImageStorageService>.Instance);
    }

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, recursive: true);
    }

    [Fact]
    public async Task LargeUploadGetsADownscaledWebpThumbnailAndKeepsItsAspectRatio()
    {
        var result = await _storage.SaveAsync(PngUpload(1600, 900));

        Assert.True(result.Success);
        Assert.Equal(1600, result.Width);
        Assert.Equal(900, result.Height);
        Assert.NotNull(result.ThumbnailUrl);
        Assert.EndsWith(".webp", result.ThumbnailUrl);

        Assert.True(_storage.TryResolveThumbnail(result.ThumbnailUrl, out var thumbPath));
        using var codec = SKCodec.Create(thumbPath);

        Assert.NotNull(codec);
        Assert.Equal(SKEncodedImageFormat.Webp, codec.EncodedFormat);
        Assert.Equal(600, codec.Info.Width);                       // long edge clamped
        Assert.Equal(338, codec.Info.Height);                      // 900 * (600/1600), rounded
    }

    [Fact]
    public async Task SmallUploadIsNotUpscaled()
    {
        var result = await _storage.SaveAsync(PngUpload(120, 80));

        Assert.True(_storage.TryResolveThumbnail(result.ThumbnailUrl, out var thumbPath));
        using var codec = SKCodec.Create(thumbPath);

        Assert.Equal(120, codec!.Info.Width);
        Assert.Equal(80, codec.Info.Height);
    }

    [Fact]
    public async Task ThumbnailIsSmallerOnDiskThanTheOriginal()
    {
        var result = await _storage.SaveAsync(PngUpload(1600, 900));

        _storage.TryResolveStoredFile(result.Url, out var originalPath);
        _storage.TryResolveThumbnail(result.ThumbnailUrl, out var thumbPath);

        Assert.True(new FileInfo(thumbPath).Length < new FileInfo(originalPath).Length);
    }

    [Fact]
    public async Task DescribeStoredImageReadsDimensionsBackFromDisk()
    {
        var result = await _storage.SaveAsync(PngUpload(640, 480));

        var (thumbnailUrl, width, height) = _storage.DescribeStoredImage(result.Url);

        Assert.Equal(result.ThumbnailUrl, thumbnailUrl);
        Assert.Equal(640, width);
        Assert.Equal(480, height);
    }

    [Fact]
    public void DescribeStoredImageRefusesAPathOutsideUploads()
    {
        var (thumbnailUrl, width, height) = _storage.DescribeStoredImage("/uploads/../../appsettings.json");

        Assert.Null(thumbnailUrl);
        Assert.Null(width);
        Assert.Null(height);
    }

    [Fact]
    public async Task DeletingAnImageAlsoRemovesItsThumbnail()
    {
        var result = await _storage.SaveAsync(PngUpload(800, 600));
        _storage.TryResolveStoredFile(result.Url, out var originalPath);
        _storage.TryResolveThumbnail(result.ThumbnailUrl, out var thumbPath);

        _storage.DeleteIfExists(result.Url, result.ThumbnailUrl);

        Assert.False(File.Exists(originalPath));
        Assert.False(File.Exists(thumbPath));
    }

    [Fact]
    public async Task ADecodeFailureStillStoresTheImage()
    {
        // Valid PNG signature, nonsense payload: the upload must survive, only the
        // thumbnail is skipped.
        var broken = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4, 5, 6 };

        var result = await _storage.SaveAsync(new FakeFormFile(broken, "x.png", "image/png"));

        Assert.True(result.Success);
        Assert.Null(result.ThumbnailUrl);
        Assert.Empty(Directory.GetFiles(_storage.ThumbnailsDirectory));
    }

    private static IFormFile PngUpload(int width, int height)
    {
        using var bitmap = new SKBitmap(width, height);
        using (var canvas = new SKCanvas(bitmap))
        {
            canvas.Clear(SKColors.CornflowerBlue);
            using var paint = new SKPaint { Color = SKColors.OrangeRed };
            canvas.DrawRect(0, 0, width / 2f, height / 2f, paint);
        }

        using var image = SKImage.FromBitmap(bitmap);
        using var data = image.Encode(SKEncodedImageFormat.Png, 100);

        return new FakeFormFile(data.ToArray(), "original.png", "image/png");
    }

    private sealed class FakeFormFile(byte[] content, string fileName, string contentType) : IFormFile
    {
        public string ContentType { get; set; } = contentType;
        public string ContentDisposition { get; set; } = string.Empty;
        public IHeaderDictionary Headers { get; set; } = new HeaderDictionary();
        public long Length => content.Length;
        public string Name { get; set; } = "file";
        public string FileName { get; set; } = fileName;

        public Stream OpenReadStream() => new MemoryStream(content, writable: false);
        public void CopyTo(Stream target) => OpenReadStream().CopyTo(target);
        public Task CopyToAsync(Stream target, CancellationToken cancellationToken = default)
            => OpenReadStream().CopyToAsync(target, cancellationToken);
    }

    private sealed class FakeEnvironment(string contentRoot) : IWebHostEnvironment
    {
        public string WebRootPath { get; set; } = null!;
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string ApplicationName { get; set; } = "RePrompt.Api.Tests";
        public string ContentRootPath { get; set; } = contentRoot;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string EnvironmentName { get; set; } = "Test";
    }
}
