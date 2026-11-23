using System.ComponentModel.DataAnnotations;

namespace LocaleFlow.Api.DTOs;

public record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(6)] string Password,
    [Required, MaxLength(120)] string FullName
);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password
);

public record AuthResponse(
    int UserId,
    string Email,
    string FullName,
    string Token,
    DateTime ExpiresAt
);