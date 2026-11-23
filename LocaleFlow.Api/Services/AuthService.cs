using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using LocaleFlow.Api.Data;
using LocaleFlow.Api.DTOs;
using LocaleFlow.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace LocaleFlow.Api.Services;

public interface IAuthService
{
    Task<(bool Success, string? Error, AuthResponse? Data)> RegisterAsync(RegisterRequest request);
    Task<(bool Success, string? Error, AuthResponse? Data)> LoginAsync(LoginRequest request);
}

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<(bool Success, string? Error, AuthResponse? Data)> RegisterAsync(RegisterRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        if (await _db.Users.AnyAsync(u => u.Email == normalizedEmail))
            return (false, "Email is already registered.", null);

        var user = new User
        {
            Email = normalizedEmail,
            FullName = request.FullName.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var authResponse = GenerateJwtResponse(user);
        return (true, null, authResponse);
    }

    public async Task<(bool Success, string? Error, AuthResponse? Data)> LoginAsync(LoginRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return (false, "Invalid email or password.", null);

        var authResponse = GenerateJwtResponse(user);
        return (true, null, authResponse);
    }

    private AuthResponse GenerateJwtResponse(User user)
    {
        var jwtSection = _config.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSection["SecretKey"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var expiryMinutes = int.Parse(jwtSection["ExpiryMinutes"] ?? "120");
        var expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("fullName", user.FullName),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: jwtSection["Issuer"],
            audience: jwtSection["Audience"],
            claims: claims,
            expires: expiresAt,
            signingCredentials: creds
        );

        return new AuthResponse(
            user.Id,
            user.Email,
            user.FullName,
            new JwtSecurityTokenHandler().WriteToken(token),
            expiresAt
        );
    }
}