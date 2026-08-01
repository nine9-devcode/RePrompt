using RePrompt.Api.Models;
using Xunit;

namespace RePrompt.Api.Tests;

public sealed class TagTests
{
    [Theory]
    [InlineData("Portrait", "portrait")]
    [InlineData("  portrait  ", "portrait")]
    [InlineData("PORTRAIT", "portrait")]
    [InlineData("Sci-Fi", "sci-fi")]
    [InlineData("ภาษาไทย", "ภาษาไทย")]
    public void NormalizeTrimsAndLowercases(string input, string expected)
    {
        Assert.Equal(expected, Tag.Normalize(input));
    }

    [Fact]
    public void CasingAndPaddingVariantsCollapseToOneTag()
    {
        var variants = new[] { "Portrait", "portrait", " PORTRAIT ", "pOrTrAiT" };

        var distinct = variants.Select(Tag.Normalize).Distinct().ToList();

        Assert.Single(distinct);
        Assert.Equal("portrait", distinct[0]);
    }

    [Fact]
    public void NormalizeUsesInvariantCasingSoATurkishLocaleCannotChangeTheResult()
    {
        // ToLower() under tr-TR maps 'I' to 'ı', which would split a tag in two.
        var previous = Thread.CurrentThread.CurrentCulture;
        try
        {
            Thread.CurrentThread.CurrentCulture = new System.Globalization.CultureInfo("tr-TR");
            Assert.Equal("filmic", Tag.Normalize("FILMIC"));
        }
        finally
        {
            Thread.CurrentThread.CurrentCulture = previous;
        }
    }
}
