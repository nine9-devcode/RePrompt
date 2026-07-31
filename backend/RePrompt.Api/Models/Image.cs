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

    [Required]
    public int PromptId { get; set; }

    // Navigation property
    [ForeignKey("PromptId")]
    [JsonIgnore] // Prevent circular reference in JSON
    public Prompt? Prompt { get; set; }
}
