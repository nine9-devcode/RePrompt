using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using RePrompt.Api.Services;
using Xunit;

namespace RePrompt.Api.Tests;

public sealed class ImageStorageServiceTests : IDisposable
{
    private readonly string _root;
    private readonly ImageStorageService _storage;

    public ImageStorageServiceTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "reprompt-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_root);
        _storage = new ImageStorageService(new FakeEnvironment(_root), NullLogger<ImageStorageService>.Instance);
    }

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, recursive: true);
    }

    [Fact]
    public void CreatesTheUploadsFolderWhenTheWebRootDoesNotExist()
    {
        // A fresh clone has no wwwroot at all, since uploads/ is gitignored.
        Assert.True(Directory.Exists(_storage.UploadsDirectory));
    }

    [Theory]
    [InlineData("/uploads/abc123.png")]
    [InlineData("/uploads/ABC-123_x.JPG")]
    [InlineData("/uploads/9f8e7d.webp")]
    [InlineData("/uploads/legacy_name with spaces.gif")]
    public void AcceptsPlainFileNamesInsideUploads(string imageUrl)
    {
        Assert.True(_storage.IsValidImageUrl(imageUrl));
    }

    [Theory]
    // Traversal — TrimStart('/') did not stop any of these.
    [InlineData("../../appsettings.json")]
    [InlineData("/uploads/../../appsettings.json")]
    [InlineData("/uploads/../appsettings.json")]
    [InlineData("/uploads/..%2F..%2Fappsettings.json")]
    [InlineData("/uploads/sub/dir/x.png")]
    [InlineData("/uploads/..")]
    [InlineData("/uploads/.")]
    // Absolute paths make Path.Combine discard the uploads directory entirely.
    [InlineData("C:\\Windows\\System32\\drivers\\etc\\hosts")]
    [InlineData("/uploads/C:\\Windows\\win.ini")]
    [InlineData("/etc/passwd")]
    // Wrong prefix or no prefix.
    [InlineData("/uploadsx/abc.png")]
    [InlineData("uploads/abc.png")]
    [InlineData("/abc.png")]
    [InlineData("/uploads/")]
    [InlineData("")]
    [InlineData(null)]
    // Extensions that are not images — these are what made stored XSS possible.
    [InlineData("/uploads/evil.html")]
    [InlineData("/uploads/evil.svg")]
    [InlineData("/uploads/evil.js")]
    [InlineData("/uploads/evil.png.html")]
    public void RejectsAnythingThatIsNotAnImageDirectlyInsideUploads(string? imageUrl)
    {
        Assert.False(_storage.IsValidImageUrl(imageUrl));
        Assert.False(_storage.TryResolveStoredFile(imageUrl, out var resolved));
        Assert.Equal(string.Empty, resolved);
    }

    [Fact]
    public void ResolvedPathAlwaysStaysInsideTheUploadsDirectory()
    {
        Assert.True(_storage.TryResolveStoredFile("/uploads/abc.png", out var resolved));
        Assert.StartsWith(_storage.UploadsDirectory + Path.DirectorySeparatorChar, resolved, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void DeleteIsANoOpForAnInvalidUrlRatherThanTouchingTheFilesystem()
    {
        var outside = Path.Combine(_root, "secret.json");
        File.WriteAllText(outside, "{}");

        _storage.DeleteIfExists("/uploads/../secret.json");

        Assert.True(File.Exists(outside));
    }

    [Theory]
    [InlineData(".png")]
    [InlineData(".jpg")]
    [InlineData(".gif")]
    [InlineData(".webp")]
    public async Task StoresTheExtensionImpliedByTheFileHeaderNotTheClientFileName(string expectedExtension)
    {
        var bytes = expectedExtension switch
        {
            ".png" => new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0 },
            ".jpg" => new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0 },
            ".gif" => "GIF89a......"u8.ToArray(),
            _ => "RIFF????WEBP"u8.ToArray(),
        };

        // The client claims it is an HTML file; only the header should be believed.
        var result = await _storage.SaveAsync(FakeFile(bytes, "evil.html", "text/html"));

        Assert.True(result.Success);
        Assert.NotNull(result.Url);
        Assert.EndsWith(expectedExtension, result.Url);
        Assert.DoesNotContain("evil", result.Url);
        Assert.DoesNotContain("html", result.Url);
        Assert.True(_storage.TryResolveStoredFile(result.Url, out var path) && File.Exists(path));
    }

    [Fact]
    public async Task RejectsAFileWhoseHeaderIsNotAKnownImageEvenWithAnImageContentType()
    {
        var html = "<html><script>alert(1)</script></html>"u8.ToArray();

        var result = await _storage.SaveAsync(FakeFile(html, "photo.png", "image/png"));

        Assert.False(result.Success);
        Assert.Empty(Directory.GetFiles(_storage.UploadsDirectory));
    }

    [Fact]
    public async Task RejectsAnEmptyOrMissingFile()
    {
        Assert.False((await _storage.SaveAsync(null)).Success);
        Assert.False((await _storage.SaveAsync(FakeFile([], "empty.png", "image/png"))).Success);
    }

    [Fact]
    public async Task RejectsAFileOverTheSizeLimit()
    {
        var oversized = new FakeFormFile(new byte[16], "big.png", "image/png", ImageStorageService.MaxFileSizeBytes + 1);

        var result = await _storage.SaveAsync(oversized);

        Assert.False(result.Success);
        Assert.Contains("too large", result.Error, StringComparison.OrdinalIgnoreCase);
    }

    private static IFormFile FakeFile(byte[] content, string fileName, string contentType)
        => new FakeFormFile(content, fileName, contentType);

    private sealed class FakeFormFile(byte[] content, string fileName, string contentType, long? reportedLength = null)
        : IFormFile
    {
        public string ContentType { get; set; } = contentType;
        public string ContentDisposition { get; set; } = string.Empty;
        public IHeaderDictionary Headers { get; set; } = new HeaderDictionary();
        public long Length => reportedLength ?? content.Length;
        public string Name { get; set; } = "file";
        public string FileName { get; set; } = fileName;

        public Stream OpenReadStream() => new MemoryStream(content, writable: false);
        public void CopyTo(Stream target) => OpenReadStream().CopyTo(target);
        public Task CopyToAsync(Stream target, CancellationToken cancellationToken = default)
            => OpenReadStream().CopyToAsync(target, cancellationToken);
    }

    private sealed class FakeEnvironment(string contentRoot) : IWebHostEnvironment
    {
        public string WebRootPath { get; set; } = null!;   // null is the fresh-clone case
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string ApplicationName { get; set; } = "RePrompt.Api.Tests";
        public string ContentRootPath { get; set; } = contentRoot;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string EnvironmentName { get; set; } = "Test";
    }
}
