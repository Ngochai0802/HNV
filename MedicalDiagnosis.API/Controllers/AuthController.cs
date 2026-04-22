using MedicalDiagnosis.API.Services;
using MedicalDiagnosis.Core.DTOs;
using MedicalDiagnosis.Core.Entities;
using MedicalDiagnosis.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
 
namespace MedicalDiagnosis.API.Controllers;
 
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly JwtService   _jwt;
 
    public AuthController(AppDbContext context, JwtService jwt)
    {
        _context = context;
        _jwt     = jwt;
    }
 
    // POST /api/auth/register
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        // Kiểm tra trùng username / email
        if (await _context.Users.AnyAsync(u => u.Username == req.Username))
            return BadRequest(new { message = "Username đã tồn tại" });
 
        if (await _context.Users.AnyAsync(u => u.Email == req.Email))
            return BadRequest(new { message = "Email đã được sử dụng" });
 
        var patientRole = await _context.Roles.FirstAsync(r => r.RoleName == "patient");
 
        var user = new User
        {
            Username     = req.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Email        = req.Email,
            FullName     = req.FullName,
            RoleId       = patientRole.Id,
            IsActive     = true,
            IsDeleted    = false,
            CreatedAt    = DateTime.Now
        };
 
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
 
        
        _context.Patients.Add(new Patient
{
    UserId      = user.Id,
    DateOfBirth = req.DateOfBirth,
    Gender      = req.Gender,
    Phone       = req.Phone,
    Address     = req.Address,
});
        await _context.SaveChangesAsync();
 
        return Ok(new { message = "Đăng ký thành công", userId = user.Id });
    }
 
    // POST /api/auth/login
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Username == req.Username && !u.IsDeleted);
 
        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Sai tài khoản hoặc mật khẩu" });
 
        if (!user.IsActive)
            return Unauthorized(new { message = "Tài khoản đã bị vô hiệu hóa" });
 
        // Cập nhật last_login & reset failed attempts
        user.LastLogin      = DateTime.Now;
        user.FailedAttempts = 0;
        user.UpdatedAt      = DateTime.Now;
 
        // Tạo tokens
        var accessToken  = _jwt.GenerateAccessToken(user);
        var refreshToken = _jwt.GenerateRefreshToken();
 
        // Lưu refresh token vào DB
        _context.UserSessions.Add(new UserSession
        {
            UserId       = user.Id,
            RefreshToken = refreshToken,
            DeviceInfo   = Request.Headers["User-Agent"].ToString(),
            IpAddress    = HttpContext.Connection.RemoteIpAddress?.ToString(),
            ExpiresAt    = DateTime.Now.AddDays(7),
            CreatedAt    = DateTime.Now
        });
 
        await _context.SaveChangesAsync();
 
        return Ok(new AuthResponse
        {
            AccessToken  = accessToken,
            RefreshToken = refreshToken,
            User = new UserInfo
            {
                Id       = user.Id,
                Username = user.Username,
                Email    = user.Email,
                FullName = user.FullName,
                Role     = user.Role!.RoleName
            }
        });
    }
 
    // POST /api/auth/refresh
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest req)
    {
        var session = await _context.UserSessions
            .Include(s => s.User).ThenInclude(u => u.Role)
            .FirstOrDefaultAsync(s => s.RefreshToken == req.RefreshToken);
 
        if (session == null || session.ExpiresAt < DateTime.Now)
            return Unauthorized(new { message = "Refresh token không hợp lệ hoặc đã hết hạn" });
 
        var newAccessToken  = _jwt.GenerateAccessToken(session.User);
        var newRefreshToken = _jwt.GenerateRefreshToken();
 
        // Xoay vòng refresh token
        session.RefreshToken = newRefreshToken;
        session.ExpiresAt    = DateTime.Now.AddDays(7);
        await _context.SaveChangesAsync();
 
        return Ok(new { accessToken = newAccessToken, refreshToken = newRefreshToken });
    }
 
    // POST /api/auth/logout
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest req)
    {
        var session = await _context.UserSessions
            .FirstOrDefaultAsync(s => s.RefreshToken == req.RefreshToken);
 
        if (session != null)
        {
            _context.UserSessions.Remove(session);
            await _context.SaveChangesAsync();
        }
 
        return Ok(new { message = "Đăng xuất thành công" });
    }
 
    // GET /api/auth/me
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();
 
        var userId = int.Parse(userIdClaim.Value);
        var user   = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);
 
        if (user == null) return NotFound();
 
        return Ok(new UserInfo
        {
            Id       = user.Id,
            Username = user.Username,
            Email    = user.Email,
            FullName = user.FullName,
            Role     = user.Role!.RoleName
        });
    }
}