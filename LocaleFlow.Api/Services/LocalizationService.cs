using System.Security.Cryptography;
using System.Text.RegularExpressions;
using LocaleFlow.Api.Data;
using LocaleFlow.Api.DTOs;
using LocaleFlow.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LocaleFlow.Api.Services;

public interface ILocalizationService
{
    Task<ProjectResponse> CreateProjectAsync(int userId, CreateProjectRequest request);
    Task<List<ProjectResponse>> GetUserProjectsAsync(int userId);
    Task<(bool Success, string? Error)> InviteMemberAsync(int requesterId, int projectId, InviteMemberRequest request);
    Task<(bool Success, string? Error, KeyWithTranslationsDto? Data)> CreateKeyAsync(int userId, int projectId, CreateKeyRequest request);
    Task<(bool Success, string? Error, List<KeyWithTranslationsDto>? Data)> GetProjectKeysAsync(int userId, int projectId, string? search, string? missingLocale);
    Task<(bool Success, string? Error, TranslationItemDto? Data)> UpsertTranslationAsync(int userId, int projectId, int keyId, UpsertTranslationRequest request);
    Task<(bool Success, string? Error)> ApproveTranslationAsync(int userId, int projectId, int translationId);
    Task<(bool Success, string? Error, List<AuditLogDto>? Data)> GetAuditHistoryAsync(int userId, int projectId, int translationId);
}

public class LocalizationService : ILocalizationService
{
    private readonly AppDbContext _db;

    public LocalizationService(AppDbContext db)
    {
        _db = db;
    }

    private async Task<(bool Allowed, string? Error, Project? Project)> AuthorizeProjectAccessAsync(
        int userId, int projectId, ProjectRole minimumRole)
    {
        var membership = await _db.ProjectMembers
            .Include(pm => pm.Project)
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

        if (membership is null)
            return (false, "Project not found or you are not a member.", null);

        if (membership.Role < minimumRole)
            return (false, $"Requires {minimumRole} role or higher.", null);

        return (true, null, membership.Project);
    }

    public async Task<ProjectResponse> CreateProjectAsync(int userId, CreateProjectRequest request)
    {
        var baseSlug = Regex.Replace(request.Name.Trim().ToLowerInvariant(), @"[^a-z0-9]+", "-").Trim('-');
        var uniqueSlug = $"{baseSlug}-{RandomNumberGenerator.GetHexString(4).ToLowerInvariant()}";
        var apiKey = $"lf_live_{RandomNumberGenerator.GetHexString(24).ToLowerInvariant()}";

        var locales = request.SupportedLocales
            .Append(request.DefaultLocale)
            .Select(l => l.Trim())
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var project = new Project
        {
            Name = request.Name.Trim(),
            Slug = uniqueSlug,
            DefaultLocale = request.DefaultLocale.Trim(),
            SupportedLocales = string.Join(",", locales),
            ApiKey = apiKey
        };

        project.Members.Add(new ProjectMember
        {
            UserId = userId,
            Role = ProjectRole.Admin
        });

        _db.Projects.Add(project);
        await _db.SaveChangesAsync();

        return new ProjectResponse(
            project.Id,
            project.Name,
            project.Slug,
            project.DefaultLocale,
            locales,
            project.ApiKey,
            ProjectRole.Admin.ToString()
        );
    }

    public async Task<List<ProjectResponse>> GetUserProjectsAsync(int userId)
    {
        return await _db.ProjectMembers
            .AsNoTracking()
            .Where(pm => pm.UserId == userId)
            .Select(pm => new ProjectResponse(
                pm.Project.Id,
                pm.Project.Name,
                pm.Project.Slug,
                pm.Project.DefaultLocale,
                pm.Project.SupportedLocales.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
                pm.Role == ProjectRole.Admin ? pm.Project.ApiKey : "********",
                pm.Role.ToString()
            ))
            .ToListAsync();
    }

    public async Task<(bool Success, string? Error)> InviteMemberAsync(int requesterId, int projectId, InviteMemberRequest request)
    {
        var (allowed, error, _) = await AuthorizeProjectAccessAsync(requesterId, projectId, ProjectRole.Admin);
        if (!allowed) return (false, error);

        var targetUser = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email.Trim().ToLowerInvariant());
        if (targetUser is null)
            return (false, "No registered user found with that email.");

        var existingMember = await _db.ProjectMembers.FindAsync(projectId, targetUser.Id);
        if (existingMember is not null)
        {
            existingMember.Role = request.Role;
        }
        else
        {
            _db.ProjectMembers.Add(new ProjectMember
            {
                ProjectId = projectId,
                UserId = targetUser.Id,
                Role = request.Role
            });
        }

        await _db.SaveChangesAsync();
        return (true, null);
    }

    public async Task<(bool Success, string? Error, KeyWithTranslationsDto? Data)> CreateKeyAsync(
        int userId, int projectId, CreateKeyRequest request)
    {
        var (allowed, error, project) = await AuthorizeProjectAccessAsync(userId, projectId, ProjectRole.Admin);
        if (!allowed || project is null) return (false, error, null);

        var normalizedKey = request.KeyName.Trim();
        if (await _db.TranslationKeys.AnyAsync(k => k.ProjectId == projectId && k.KeyName == normalizedKey))
            return (false, $"Key '{normalizedKey}' already exists in this project.", null);

        var keyEntity = new TranslationKey
        {
            ProjectId = projectId,
            KeyName = normalizedKey,
            Description = request.Description?.Trim(),
            MaxLength = request.MaxLength
        };

        if (!string.IsNullOrWhiteSpace(request.InitialDefaultValue))
        {
            var translation = new Translation
            {
                Locale = project.DefaultLocale,
                Value = request.InitialDefaultValue,
                Status = TranslationStatus.Approved
            };
            translation.AuditLogs.Add(new AuditLog
            {
                ChangedByUserId = userId,
                OldValue = null,
                NewValue = request.InitialDefaultValue
            });
            keyEntity.Translations.Add(translation);
        }

        _db.TranslationKeys.Add(keyEntity);
        await _db.SaveChangesAsync();

        var dto = new KeyWithTranslationsDto(
            keyEntity.Id,
            keyEntity.KeyName,
            keyEntity.Description,
            keyEntity.MaxLength,
            keyEntity.Translations.Select(t => new TranslationItemDto(
                t.Id, t.Locale, t.Value, t.Status.ToString(), t.UpdatedAt)).ToList()
        );

        return (true, null, dto);
    }

    public async Task<(bool Success, string? Error, List<KeyWithTranslationsDto>? Data)> GetProjectKeysAsync(
        int userId, int projectId, string? search, string? missingLocale)
    {
        var (allowed, error, _) = await AuthorizeProjectAccessAsync(userId, projectId, ProjectRole.Viewer);
        if (!allowed) return (false, error, null);

        var query = _db.TranslationKeys
            .AsNoTracking()
            .Where(k => k.ProjectId == projectId);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(k => k.KeyName.Contains(search));

        if (!string.IsNullOrWhiteSpace(missingLocale))
            query = query.Where(k => !k.Translations.Any(t => t.Locale == missingLocale && t.Status == TranslationStatus.Approved));

        var results = await query
            .OrderBy(k => k.KeyName)
            .Select(k => new KeyWithTranslationsDto(
                k.Id,
                k.KeyName,
                k.Description,
                k.MaxLength,
                k.Translations.Select(t => new TranslationItemDto(
                    t.Id, t.Locale, t.Value, t.Status.ToString(), t.UpdatedAt)).ToList()
            ))
            .ToListAsync();

        return (true, null, results);
    }

    public async Task<(bool Success, string? Error, TranslationItemDto? Data)> UpsertTranslationAsync(
        int userId, int projectId, int keyId, UpsertTranslationRequest request)
    {
        var (allowed, error, _) = await AuthorizeProjectAccessAsync(userId, projectId, ProjectRole.Translator);
        if (!allowed) return (false, error, null);

        var keyEntity = await _db.TranslationKeys
            .Include(k => k.Translations)
            .FirstOrDefaultAsync(k => k.Id == keyId && k.ProjectId == projectId);

        if (keyEntity is null)
            return (false, "Translation key not found in project.", null);

        if (keyEntity.MaxLength.HasValue && request.Value.Length > keyEntity.MaxLength.Value)
            return (false, $"Translation value exceeds max length of {keyEntity.MaxLength.Value}.", null);

        var locale = request.Locale.Trim();
        var existing = keyEntity.Translations.FirstOrDefault(t => t.Locale.Equals(locale, StringComparison.OrdinalIgnoreCase));

        Translation translation;
        if (existing is null)
        {
            translation = new Translation
            {
                TranslationKeyId = keyId,
                Locale = locale,
                Value = request.Value,
                Status = TranslationStatus.Draft,
                UpdatedAt = DateTime.UtcNow
            };
            translation.AuditLogs.Add(new AuditLog
            {
                ChangedByUserId = userId,
                OldValue = null,
                NewValue = request.Value,
                ChangedAt = DateTime.UtcNow
            });
            _db.Translations.Add(translation);
        }
        else
        {
            var oldValue = existing.Value;
            existing.Value = request.Value;
            existing.Status = TranslationStatus.NeedsReview;
            existing.UpdatedAt = DateTime.UtcNow;

            existing.AuditLogs.Add(new AuditLog
            {
                ChangedByUserId = userId,
                OldValue = oldValue,
                NewValue = request.Value,
                ChangedAt = DateTime.UtcNow
            });
            translation = existing;
        }

        await _db.SaveChangesAsync();

        var dto = new TranslationItemDto(
            translation.Id,
            translation.Locale,
            translation.Value,
            translation.Status.ToString(),
            translation.UpdatedAt
        );

        return (true, null, dto);
    }

    public async Task<(bool Success, string? Error)> ApproveTranslationAsync(
        int userId, int projectId, int translationId)
    {
        var (allowed, error, _) = await AuthorizeProjectAccessAsync(userId, projectId, ProjectRole.Admin);
        if (!allowed) return (false, error);

        var translation = await _db.Translations
            .Include(t => t.TranslationKey)
            .ThenInclude(k => k.Project)
            .FirstOrDefaultAsync(t => t.Id == translationId && t.TranslationKey.ProjectId == projectId);

        if (translation is null)
            return (false, "Translation not found.");

        translation.Status = TranslationStatus.Approved;
        translation.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return (true, null);
    }

    public async Task<(bool Success, string? Error, List<AuditLogDto>? Data)> GetAuditHistoryAsync(
        int userId, int projectId, int translationId)
    {
        var (allowed, error, _) = await AuthorizeProjectAccessAsync(userId, projectId, ProjectRole.Viewer);
        if (!allowed) return (false, error, null);

        var exists = await _db.Translations
            .AnyAsync(t => t.Id == translationId && t.TranslationKey.ProjectId == projectId);

        if (!exists)
            return (false, "Translation not found in project.", null);

        var logs = await _db.AuditLogs
            .AsNoTracking()
            .Where(a => a.TranslationId == translationId)
            .Include(a => a.ChangedByUser)
            .OrderByDescending(a => a.ChangedAt)
            .Select(a => new AuditLogDto(
                a.Id,
                a.ChangedByUser.Email,
                a.OldValue,
                a.NewValue,
                a.ChangedAt
            ))
            .ToListAsync();

        return (true, null, logs);
    }
}
