using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace RePrompt.Api.Models;

[Index(nameof(Name), IsUnique = true)]
public class Tag
{
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// Stored trimmed and lowercased so "Portrait", "portrait" and " portrait " are one tag.
    /// Use <see cref="Normalize"/> for every value that reaches this property.
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    [JsonIgnore]
    public List<Prompt> Prompts { get; set; } = [];

    public static string Normalize(string name) => name.Trim().ToLowerInvariant();
}
