using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace RePrompt.Api.Models;

[Index(nameof(Category))]
[Index(nameof(ModelName))]
[Index(nameof(CreatedAt))]
public class Prompt
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string PositivePrompt { get; set; } = string.Empty;

    public string? NegativePrompt { get; set; }

    public string? Sampler { get; set; }

    public int Steps { get; set; } = 20;

    public float CFGScale { get; set; } = 7.0f;

    public string? Seed { get; set; }

    public string? ModelName { get; set; }

    [MaxLength(100)]
    public string Category { get; set; } = "General";

    public bool IsNsfw { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property for Images (One-to-Many)
    public List<Image> Images { get; set; } = new();
}
