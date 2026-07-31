using System.ComponentModel.DataAnnotations;

namespace RePrompt.Api.Dtos;

/// <summary>
/// Write model for prompts. Deliberately separate from the entity so a client cannot
/// set Id or attach an arbitrary image graph by posting extra JSON properties.
/// </summary>
public sealed class PromptRequest
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(20000)]
    public string PositivePrompt { get; set; } = string.Empty;

    [MaxLength(20000)]
    public string? NegativePrompt { get; set; }

    [MaxLength(200)]
    public string? Sampler { get; set; }

    [Range(1, 1000)]
    public int Steps { get; set; } = 20;

    [Range(0, 100)]
    public float CFGScale { get; set; } = 7.0f;

    [MaxLength(100)]
    public string? Seed { get; set; }

    [MaxLength(200)]
    public string? ModelName { get; set; }

    [MaxLength(100)]
    public string Category { get; set; } = "General";

    public bool IsNsfw { get; set; }

    /// <summary>
    /// Optional; the form lets the user backdate an entry. Defaults to now on create
    /// and is left unchanged on update when omitted.
    /// </summary>
    public DateTime? CreatedAt { get; set; }

    [MaxLength(20, ErrorMessage = "A prompt cannot have more than 20 images.")]
    public List<ImageRequest> Images { get; set; } = [];
}

public sealed class ImageRequest
{
    [Required]
    [MaxLength(400)]
    public string ImageUrl { get; set; } = string.Empty;
}
