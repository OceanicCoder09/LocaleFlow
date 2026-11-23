using System.Security.Claims;
using LocaleFlow.Api.DTOs;
using LocaleFlow.Api.Services;

namespace LocaleFlow.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Authentication");

        group.MapPost("/register", async (RegisterRequest request, IAuthService authService) =>
        {
            var (success, error, data) = await authService.RegisterAsync(request);
            return success ? Results.Ok(data) : Results.Conflict(new { message = error });
        });

        group.MapPost("/login", async (LoginRequest request, IAuthService authService) =>
        {
            var (success, error, data) = await authService.LoginAsync(request);
            return success ? Results.Ok(data) : Results.Unauthorized();
        });

        // Protected endpoint to verify JWT token decoding works
        group.MapGet("/me", (ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier)
                         ?? user.FindFirstValue("sub");
            var email = user.FindFirstValue(ClaimTypes.Email);
            var fullName = user.FindFirstValue("fullName");

            return Results.Ok(new { userId, email, fullName });
        }).RequireAuthorization();
    }
}