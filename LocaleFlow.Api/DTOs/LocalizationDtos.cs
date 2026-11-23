using System.ComponentModel.DataAnnotations;
using LocaleFlow.Api.Models;

namespace LocaleFlow.Api.DTOs;

// --- Projects & Members ---
public record CreateProjectRequest(
    [Required, MaxLength(120)] string Name,
    [Required, MaxLength(16)] string DefaultLocale,
    [Required] List<string> SupportedLocales
);

public record ProjectResponse(
    int Id,
    string Name,
    string Slug,
    string DefaultLocale,
    List<string> SupportedLocales,
    string ApiKey,
    string YourRole
);

public record InviteMemberRequest(
    [Required, EmailAddress] string Email,
    [Required] ProjectRole Role
);

// --- Keys & Translations ---
public record CreateKeyRequest(
    [Required, MaxLength(255)] string KeyName,
    [MaxLength(500)] string? Description,
    int? MaxLength,
    string? InitialDefaultValue
);

public record UpsertTranslationRequest(
    [Required, MaxLength(16)] string Locale,
    [Required] string Value
);

public record TranslationItemDto(
    int Id,
    string Locale,
    string Value,
    string Status,
    DateTime UpdatedAt
);

public record KeyWithTranslationsDto(
    int KeyId,
    string KeyName,
    string? Description,
    int? MaxLength,
    List<TranslationItemDto> Translations
);

public record AuditLogDto(
    int Id,
    string ChangedByEmail,
    string? OldValue,
    string NewValue,
    DateTime ChangedAt
);