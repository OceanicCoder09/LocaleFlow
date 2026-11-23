using System.ComponentModel.DataAnnotations;

namespace LocaleFlow.Api.Models;

public class TranslationKey
{
    public int Id { get; set; }

    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    [Required, MaxLength(255)]
    public string KeyName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    public int? MaxLength { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<Translation> Translations { get; set; } = new List<Translation>();
}