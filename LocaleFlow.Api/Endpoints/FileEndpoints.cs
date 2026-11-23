using System.Security.Claims;
using LocaleFlow.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LocaleFlow.Api.Endpoints;

public static class FileEndpoints
{
    private static int GetUserId(ClaimsPrincipal user)
    {
        var rawId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        return int.Parse(rawId!);
    }

    public static void MapFileEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/projects/{projectId:int}")
            .WithTags("Bulk Import & Export")
            .RequireAuthorization();

        // Upload .json or .resx file
        group.MapPost("/import", async (
            int projectId,
            [FromQuery] string locale,
            IFormFile file,
            ClaimsPrincipal user,
            IFileLocalizationService fileService) =>
        {
            var (success, error, data) = await fileService.ImportFileAsync(GetUserId(user), projectId, locale, file);
            return success ? Results.Ok(data) : Results.BadRequest(new { message = error });
        }).DisableAntiforgery();

        // Download compiled .json or .resx bundle
        group.MapGet("/export", async (
            int projectId,
            [FromQuery] string locale,
            [FromQuery] string format,
            ClaimsPrincipal user,
            IFileLocalizationService fileService) =>
        {
            var (success, error, content, contentType, fileName) =
                await fileService.ExportFileAsync(GetUserId(user), projectId, locale, format);

            if (!success || content is null)
                return Results.BadRequest(new { message = error });

            return Results.File(content, contentType!, fileName!);
        });
    }
}