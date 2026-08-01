using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace RePrompt.Api.Models;

public class Image
{
    [Key]
    public int Id { get; set; }

    [Required]
    public string ImageUrl { get; set; } = string.Empty;

    /// <summary>
    /// Downscaled copy served in the gallery. Null for images uploaded before thumbnails
    /// existed, or when generation failed — callers fall back to <see cref="ImageUrl"/>.
    /// </summary>
    public string? ThumbnailUrl { get; set; }

    /// <summary>Intrinsic size of the original, so the gallery can reserve space and not jump.</summary>
    public int? Width { get; set; }

    public int? Height { get; set; }

    [Required]
    public int PromptId { get; set; }

    // Navigation property
    [ForeignKey("PromptId")]
    [JsonIgnore] // Prevent circular reference in JSON
    public Prompt? Prompt { get; set; }
}
