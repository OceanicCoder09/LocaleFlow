using System.ComponentModel.DataAnnotations;

namespace LocaleFlow.Api.Models;

public class Translation
{
    public int Id { get; set; }

    public int TranslationKeyId { get; set; }
    public TranslationKey TranslationKey { get; set; } = null!;

    [Required, MaxLength(16)]
    public string Locale { get; set; } = string.Empty;

    [Required]
    public string Value { get; set; } = string.Empty;

    public TranslationStatus Status { get; set; } = TranslationStatus.Draft;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}