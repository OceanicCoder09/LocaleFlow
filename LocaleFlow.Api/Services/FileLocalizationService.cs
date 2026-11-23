using System.Text;
using System.Text.Json;
using System.Xml.Linq;
using LocaleFlow.Api.Data;
using LocaleFlow.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LocaleFlow.Api.Services;

public record ImportSummaryResponse(
    string Locale,
    int KeysCreated,
    int TranslationsUpdated,
    int TotalProcessed
);

public interface IFileLocalizationService
{
    Task<(bool Success, string? Error, ImportSummaryResponse? Data)> ImportFileAsync(
        int userId, int projectId, string locale, IFormFile file);

    Task<(bool Success, string? Error, byte[]? Content, string? ContentType, string? FileName)> ExportFileAsync(
        int userId, int projectId, string locale, string format);
}

public class FileLocalizationService : IFileLocalizationService
{
    private readonly AppDbContext _db;

    public FileLocalizationService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<(bool Success, string? Error, ImportSummaryResponse? Data)> ImportFileAsync(
        int userId, int projectId, string locale, IFormFile file)
    {
        var membership = await _db.ProjectMembers
            .Include(pm => pm.Project)
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

        if (membership is null || membership.Role < ProjectRole.Admin)
            return (false, "Only project Admins can bulk-import localization files.", null);

        var project = membership.Project;
        var supported = project.SupportedLocales.Split(',', StringSplitOptions.RemoveEmptyEntries);
        if (!supported.Contains(locale, StringComparer.OrdinalIgnoreCase))
            return (false, $"Locale '{locale}' is not configured in this project.", null);

        if (file.Length == 0)
            return (false, "Uploaded file is empty.", null);

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        Dictionary<string, string> parsedEntries;

        try
        {
            using var stream = file.OpenReadStream();
            parsedEntries = extension switch
            {
                ".json" => await ParseJsonStreamAsync(stream),
                ".resx" => await ParseResxStreamAsync(stream),
                _ => throw new NotSupportedException("Unsupported file format. Upload .json or .resx.")
            };
        }
        catch (Exception ex)
        {
            return (false, $"File parse error: {ex.Message}", null);
        }

        var existingKeys = await _db.TranslationKeys
            .Include(k => k.Translations)
            .Where(k => k.ProjectId == projectId)
            .ToDictionaryAsync(k => k.KeyName, StringComparer.Ordinal);

        int keysCreated = 0;
        int translationsUpdated = 0;

        foreach (var (rawKey, value) in parsedEntries)
        {
            var keyName = rawKey.Trim();
            if (string.IsNullOrWhiteSpace(keyName)) continue;

            if (!existingKeys.TryGetValue(keyName, out var keyEntity))
            {
                keyEntity = new TranslationKey
                {
                    ProjectId = projectId,
                    KeyName = keyName
                };
                _db.TranslationKeys.Add(keyEntity);
                existingKeys[keyName] = keyEntity;
                keysCreated++;
            }

            var existingTranslation = keyEntity.Translations
                .FirstOrDefault(t => t.Locale.Equals(locale, StringComparison.OrdinalIgnoreCase));

            if (existingTranslation is null)
            {
                var newTranslation = new Translation
                {
                    Locale = locale.Trim(),
                    Value = value,
                    Status = TranslationStatus.Approved,
                    UpdatedAt = DateTime.UtcNow
                };
                newTranslation.AuditLogs.Add(new AuditLog
                {
                    ChangedByUserId = userId,
                    OldValue = null,
                    NewValue = value,
                    ChangedAt = DateTime.UtcNow
                });
                keyEntity.Translations.Add(newTranslation);
                translationsUpdated++;
            }
            else if (existingTranslation.Value != value)
            {
                var oldValue = existingTranslation.Value;
                existingTranslation.Value = value;
                existingTranslation.Status = TranslationStatus.Approved;
                existingTranslation.UpdatedAt = DateTime.UtcNow;

                existingTranslation.AuditLogs.Add(new AuditLog
                {
                    ChangedByUserId = userId,
                    OldValue = oldValue,
                    NewValue = value,
                    ChangedAt = DateTime.UtcNow
                });
                translationsUpdated++;
            }
        }

        await _db.SaveChangesAsync();

        return (true, null, new ImportSummaryResponse(
            locale, keysCreated, translationsUpdated, parsedEntries.Count));
    }

    public async Task<(bool Success, string? Error, byte[]? Content, string? ContentType, string? FileName)> ExportFileAsync(
        int userId, int projectId, string locale, string format)
    {
        var membership = await _db.ProjectMembers
            .Include(pm => pm.Project)
            .AsNoTracking()
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

        if (membership is null)
            return (false, "Access denied.", null, null, null);

        var project = membership.Project;

        var keys = await _db.TranslationKeys
            .AsNoTracking()
            .Where(k => k.ProjectId == projectId)
            .OrderBy(k => k.KeyName)
            .Select(k => new
            {
                k.KeyName,
                TargetValue = k.Translations
                    .Where(t => t.Locale == locale && t.Status == TranslationStatus.Approved)
                    .Select(t => t.Value)
                    .FirstOrDefault(),
                FallbackValue = k.Translations
                    .Where(t => t.Locale == project.DefaultLocale && t.Status == TranslationStatus.Approved)
                    .Select(t => t.Value)
                    .FirstOrDefault()
            })
            .ToListAsync();

        var dictionary = new Dictionary<string, string>();
        foreach (var item in keys)
        {
            var resolved = item.TargetValue ?? item.FallbackValue;
            if (resolved is not null)
                dictionary[item.KeyName] = resolved;
        }

        var normalizedFormat = format.Trim().ToLowerInvariant();
        if (normalizedFormat == "resx")
        {
            var xmlBytes = BuildResxBytes(dictionary);
            return (true, null, xmlBytes, "application/xml", $"{project.Slug}.{locale}.resx");
        }

        var jsonBytes = JsonSerializer.SerializeToUtf8Bytes(
            dictionary, new JsonSerializerOptions { WriteIndented = true });
        return (true, null, jsonBytes, "application/json", $"{project.Slug}.{locale}.json");
    }

    private static async Task<Dictionary<string, string>> ParseJsonStreamAsync(Stream stream)
    {
        using var doc = await JsonDocument.ParseAsync(stream);
        var result = new Dictionary<string, string>();
        FlattenJsonElement(doc.RootElement, prefix: string.Empty, result);
        return result;
    }

    private static void FlattenJsonElement(JsonElement element, string prefix, Dictionary<string, string> result)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var prop in element.EnumerateObject())
            {
                var nextKey = string.IsNullOrEmpty(prefix) ? prop.Name : $"{prefix}.{prop.Name}";
                FlattenJsonElement(prop.Value, nextKey, result);
            }
        }
        else if (element.ValueKind == JsonValueKind.String)
        {
            result[prefix] = element.GetString() ?? string.Empty;
        }
    }

    private static async Task<Dictionary<string, string>> ParseResxStreamAsync(Stream stream)
    {
        var doc = await XDocument.LoadAsync(stream, LoadOptions.None, CancellationToken.None);
        var result = new Dictionary<string, string>();

        foreach (var dataElement in doc.Descendants("data"))
        {
            var name = dataElement.Attribute("name")?.Value;
            var value = dataElement.Element("value")?.Value;
            if (!string.IsNullOrWhiteSpace(name) && value is not null)
            {
                result[name] = value;
            }
        }

        return result;
    }

    private static byte[] BuildResxBytes(Dictionary<string, string> entries)
    {
        var root = new XElement("root",
            new XElement("resheader", new XAttribute("name", "resmimetype"), new XElement("value", "text/microsoft-resx")),
            new XElement("resheader", new XAttribute("name", "version"), new XElement("value", "2.0")),
            entries.Select(kvp =>
                new XElement("data",
                    new XAttribute("name", kvp.Key),
                    new XAttribute(XNamespace.Xml + "space", "preserve"),
                    new XElement("value", kvp.Value)))
        );

        var doc = new XDocument(new XDeclaration("1.0", "utf-8", null), root);
        return Encoding.UTF8.GetBytes(doc.ToString());
    }
}