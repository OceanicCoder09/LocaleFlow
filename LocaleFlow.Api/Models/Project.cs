using System.ComponentModel.DataAnnotations;

namespace LocaleFlow.Api.Models;

public class Project
{
    public int Id { get; set; }

    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(120)]
    public string Slug { get; set; } = string.Empty;

    [Required, MaxLength(16)]
    public string DefaultLocale { get; set; } = "en-US";

    // Stored as comma-separated locales e.g. "en-US,hi-IN,mr-IN"
    [Required, MaxLength(500)]
    public string SupportedLocales { get; set; } = "en-US";

    [Required, MaxLength(128)]
    public string ApiKey { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<ProjectMember> Members { get; set; } = new List<ProjectMember>();
    public ICollection<TranslationKey> TranslationKeys { get; set; } = new List<TranslationKey>();
}