using MedicalDiagnosis.Core.Entities;
using MedicalDiagnosis.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MedicalDiagnosis.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdminController(AppDbContext context)
    {
        _context = context;
    }

    // =========================================
    // 🔥 BUG 3 — QUẢN LÝ LỊCH KHÁM
    // =========================================

    // GET /api/admin/appointments
    [HttpGet("appointments")]
    public async Task<IActionResult> GetAppointments()
    {
        var appointments = await _context.Appointments
            .Include(a => a.Patient).ThenInclude(p => p!.User)
            .Include(a => a.Doctor).ThenInclude(d => d!.User)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                a.Id,
                a.AppointmentTime,
                a.Status,
                a.Note,
                a.CreatedAt,
                PatientName = a.Patient!.User!.FullName,
                DoctorName  = a.Doctor!.User!.FullName,
                a.DoctorId
            })
            .ToListAsync();

        return Ok(appointments);
    }

    // PATCH /api/admin/appointments/{id}/approve
    [HttpPatch("appointments/{id}/approve")]
    public async Task<IActionResult> ApproveAppointment(int id)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Patient).ThenInclude(p => p!.User)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appointment == null)
            return NotFound(new { message = "Không tìm thấy lịch khám" });

        if (appointment.Status == "confirmed")
            return BadRequest(new { message = "Lịch đã được xác nhận trước đó" });

        // ✅ Cập nhật trạng thái
        appointment.Status = "confirmed";

        // 🔥 Notify cho bác sĩ (ĐÚNG FLOW)
        _context.Notifications.Add(new Notification
        {
            UserId    = appointment.DoctorId,
            Title     = "Lịch khám mới đã được xác nhận",
            Content   = $"Bệnh nhân {appointment.Patient!.User!.FullName} đặt lịch vào {appointment.AppointmentTime:dd/MM/yyyy HH:mm}",
            IsRead    = false,
            CreatedAt = DateTime.Now
        });

        await _context.SaveChangesAsync();

        return Ok(new { message = "Đã xác nhận lịch khám" });
    }

    // =========================================
    // IMAGE MANAGEMENT
    // =========================================

    // GET /api/admin/images?status=pending
    [HttpGet("images")]
    public async Task<IActionResult> GetImages([FromQuery] string? status)
    {
        var query = _context.MedicalImages
            .Include(m => m.Patient).ThenInclude(p => p!.User)
            .Where(m => !m.IsDeleted);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(m => m.Status == status);

        var images = await query
            .OrderByDescending(m => m.UploadDate)
            .Select(m => new
            {
                m.Id,
                m.FileName,
                m.ImageUrl,
                m.Status,
                m.UploadDate,
                PatientName = m.Patient!.User!.FullName,
                IsAssigned  = _context.ImageAssignments.Any(a => a.ImageId == m.Id)
            })
            .ToListAsync();

        return Ok(images);
    }

    // GET /api/admin/doctors
    [HttpGet("doctors")]
    public async Task<IActionResult> GetDoctors()
    {
        var doctors = await _context.Doctors
            .Include(d => d.User)
            .Where(d => d.User!.IsActive && !d.User.IsDeleted)
            .Select(d => new
            {
                d.UserId,
                d.User!.FullName,
                d.User.Email,
                d.Specialization,
                d.LicenseNumber,
                d.YearsOfExperience,
                AssignedCount = _context.ImageAssignments
                    .Count(a => a.DoctorId == d.UserId && a.Status == "pending")
            })
            .ToListAsync();

        return Ok(doctors);
    }

    // POST /api/admin/images/{id}/assign
    [HttpPost("images/{id}/assign")]
    public async Task<IActionResult> AssignImage(int id, [FromBody] AssignRequest req)
    {
        var adminId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var image = await _context.MedicalImages.FindAsync(id);
        if (image == null)
            return NotFound(new { message = "Không tìm thấy ảnh" });

        var doctor = await _context.Doctors.FindAsync(req.DoctorId);
        if (doctor == null)
            return NotFound(new { message = "Không tìm thấy bác sĩ" });

        var assignment = new ImageAssignment
        {
            ImageId    = id,
            DoctorId   = req.DoctorId,
            AssignedBy = adminId,
            AssignedAt = DateTime.Now,
            Status     = "pending"
        };
        _context.ImageAssignments.Add(assignment);

        image.Status = "assigned";

        _context.Notifications.Add(new Notification
        {
            UserId    = req.DoctorId,
            Title     = "Ca mới được phân công",
            Content   = $"Bạn được phân công xem xét ảnh #{id}",
            IsRead    = false,
            CreatedAt = DateTime.Now
        });

        await _context.SaveChangesAsync();

        return Ok(new { message = "Phân công thành công" });
    }

    // =========================================
    // USER MANAGEMENT
    // =========================================

    // GET /api/admin/users
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _context.Users
            .Include(u => u.Role)
            .Where(u => !u.IsDeleted)
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.Email,
                u.FullName,
                Role     = u.Role!.RoleName,
                u.IsActive,
                u.CreatedAt,
                u.LastLogin
            })
            .ToListAsync();

        return Ok(users);
    }

    // PATCH /api/admin/users/{id}/toggle
    [HttpPatch("users/{id}/toggle")]
    public async Task<IActionResult> ToggleUser(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();

        user.IsActive  = !user.IsActive;
        user.UpdatedAt = DateTime.Now;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message  = user.IsActive ? "Đã kích hoạt" : "Đã vô hiệu hóa",
            isActive = user.IsActive
        });
    }

    // POST /api/admin/doctors
    [HttpPost("doctors")]
    public async Task<IActionResult> CreateDoctor([FromBody] CreateDoctorRequest req)
    {
        if (await _context.Users.AnyAsync(u => u.Username == req.Username))
            return BadRequest(new { message = "Username đã tồn tại" });

        if (await _context.Users.AnyAsync(u => u.Email == req.Email))
            return BadRequest(new { message = "Email đã được sử dụng" });

        var user = new User
        {
            Username     = req.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Email        = req.Email,
            FullName     = req.FullName,
            RoleId       = 2,
            IsActive     = true,
            IsDeleted    = false,
            CreatedAt    = DateTime.Now,
            UpdatedAt    = DateTime.Now
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        _context.Doctors.Add(new Doctor
        {
            UserId            = user.Id,
            Specialization    = req.Specialization,
            LicenseNumber     = req.LicenseNumber,
            YearsOfExperience = req.YearsOfExperience
        });

        await _context.SaveChangesAsync();

        return Ok(new { message = "Tạo bác sĩ thành công", userId = user.Id });
    }
}

// DTOs
public class AssignRequest
{
    public int DoctorId { get; set; }
}

public class CreateDoctorRequest
{
    public string Username         { get; set; } = null!;
    public string Password         { get; set; } = null!;
    public string Email            { get; set; } = null!;
    public string FullName         { get; set; } = null!;
    public string? Specialization  { get; set; }
    public string? LicenseNumber   { get; set; }
    public int YearsOfExperience   { get; set; }
}