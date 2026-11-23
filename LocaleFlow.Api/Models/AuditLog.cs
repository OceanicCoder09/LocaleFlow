using System.ComponentModel.DataAnnotations;

namespace LocaleFlow.Api.Models;

public class AuditLog
{
    public int Id { get; set; }

    public int TranslationId { get; set; }
    public Translation Translation { get; set; } = null!;

    public int ChangedByUserId { get; set; }
    public User ChangedByUser { get; set; } = null!;

    public string? OldValue { get; set; }

    [Required]
    public string NewValue { get; set; } = string.Empty;

    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
}