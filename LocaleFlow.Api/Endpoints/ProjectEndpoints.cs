using System.Security.Claims;
using LocaleFlow.Api.DTOs;
using LocaleFlow.Api.Services;

namespace LocaleFlow.Api.Endpoints;

public static class ProjectEndpoints
{
    private static int GetUserId(ClaimsPrincipal user)
    {
        var rawId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        return int.Parse(rawId!);
    }

    public static void MapProjectEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/projects")
            .WithTags("Projects & Localization")
            .RequireAuthorization();

        // Create workspace
        group.MapPost("/", async (CreateProjectRequest req, ClaimsPrincipal user, ILocalizationService service) =>
        {
            var project = await service.CreateProjectAsync(GetUserId(user), req);
            return Results.Created($"/api/projects/{project.Id}", project);
        });

        // List caller's workspaces
        group.MapGet("/", async (ClaimsPrincipal user, ILocalizationService service) =>
        {
            var projects = await service.GetUserProjectsAsync(GetUserId(user));
            return Results.Ok(projects);
        });

        // Invite team member with role (Admin only)
        group.MapPost("/{projectId:int}/members", async (int projectId, InviteMemberRequest req, ClaimsPrincipal user, ILocalizationService service) =>
        {
            var (success, error) = await service.InviteMemberAsync(GetUserId(user), projectId, req);
            return success ? Results.Ok(new { message = "Member role updated." }) : Results.BadRequest(new { message = error });
        });

        // Create translation key (Admin only)
        group.MapPost("/{projectId:int}/keys", async (int projectId, CreateKeyRequest req, ClaimsPrincipal user, ILocalizationService service) =>
        {
            var (success, error, data) = await service.CreateKeyAsync(GetUserId(user), projectId, req);
            return success ? Results.Ok(data) : Results.BadRequest(new { message = error });
        });

        // Search keys & filter missing translations (Viewer+)
        group.MapGet("/{projectId:int}/keys", async (int projectId, string? search, string? missingLocale, ClaimsPrincipal user, ILocalizationService service) =>
        {
            var (success, error, data) = await service.GetProjectKeysAsync(GetUserId(user), projectId, search, missingLocale);
            return success ? Results.Ok(data) : Results.Forbid();
        });

        // Add or update translation string + write AuditLog (Translator+)
        group.MapPut("/{projectId:int}/keys/{keyId:int}/translations", async (int projectId, int keyId, UpsertTranslationRequest req, ClaimsPrincipal user, ILocalizationService service) =>
        {
            var (success, error, data) = await service.UpsertTranslationAsync(GetUserId(user), projectId, keyId, req);
            return success ? Results.Ok(data) : Results.BadRequest(new { message = error });
        });

        // Approve translation string (Admin only)
        group.MapPatch("/{projectId:int}/translations/{translationId:int}/approve", async (int projectId, int translationId, ClaimsPrincipal user, ILocalizationService service) =>
        {
            var (success, error) = await service.ApproveTranslationAsync(GetUserId(user), projectId, translationId);
            return success ? Results.Ok(new { message = "Translation approved." }) : Results.BadRequest(new { message = error });
        });

        // View audit history for a translation (Viewer+)
        group.MapGet("/{projectId:int}/translations/{translationId:int}/history", async (int projectId, int translationId, ClaimsPrincipal user, ILocalizationService service) =>
        {
            var (success, error, data) = await service.GetAuditHistoryAsync(GetUserId(user), projectId, translationId);
            return success ? Results.Ok(data) : Results.Forbid();
        });
    }
}