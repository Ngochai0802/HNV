using MedicalDiagnosis.API.Services;
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
    private readonly AutoAssignService _autoAssign;

    public AdminController(AppDbContext context, AutoAssignService autoAssign)
    {
        _context = context;
        _autoAssign = autoAssign;
    }

    // =========================================
    // CHẾ ĐỘ TỰ ĐỘNG PHÂN CÔNG
    // =========================================

    // GET /api/admin/auto-assign/status
    [HttpGet("auto-assign/status")]
    public IActionResult GetAutoAssignStatus()
    {
        return Ok(new { isEnabled = _autoAssign.IsEnabled });
    }

    // POST /api/admin/auto-assign/toggle
    [HttpPost("auto-assign/toggle")]
    public IActionResult ToggleAutoAssign()
    {
        var newState = _autoAssign.Toggle();
        return Ok(new
        {
            isEnabled = newState,
            message = newState ? "Đã BẬT chế độ tự động phân công" : "Đã TẮT chế độ tự động phân công"
        });
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
    // TỰ ĐỘNG PHÂN CÔNG ẢNH
    // =========================================

    // POST /api/admin/images/auto-assign
    [HttpPost("images/auto-assign")]
    public async Task<IActionResult> AutoAssignImages()
    {
        var adminId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // 1. Lấy tất cả ảnh chưa phân công
        var assignedImageIds = await _context.ImageAssignments
            .Select(a => a.ImageId)
            .ToListAsync();

        var pendingImages = await _context.MedicalImages
            .Where(m => m.Status == "pending" && !m.IsDeleted && !assignedImageIds.Contains(m.Id))
            .OrderBy(m => m.UploadDate)
            .ToListAsync();

        if (pendingImages.Count == 0)
            return Ok(new { assignedCount = 0, message = "Không có ảnh nào cần phân công" });

        // 2. Lấy danh sách bác sĩ eligible
        var eligibleDoctors = await _context.Doctors
            .Include(d => d.User)
            .Where(d => d.User!.IsActive && !d.User.IsDeleted)
            .Select(d => new
            {
                d.UserId,
                d.User!.FullName,
                d.Specialization,
                AssignedCount = _context.ImageAssignments
                    .Count(a => a.DoctorId == d.UserId && a.Status != "completed"),
                LastAssignedAt = _context.ImageAssignments
                    .Where(a => a.DoctorId == d.UserId)
                    .Max(a => (DateTime?)a.AssignedAt)
            })
            .ToListAsync();

        if (eligibleDoctors.Count == 0)
            return BadRequest(new { message = "Không có bác sĩ khả dụng" });

        // 3. Sắp xếp theo tiêu chí ưu tiên
        var specialtyKeywords = new[] { "phổi", "hô hấp", "x-quang", "chẩn đoán hình ảnh" };

        var sortedDoctors = eligibleDoctors
            .Select(d => new
            {
                d.UserId,
                d.FullName,
                d.Specialization,
                d.AssignedCount,
                d.LastAssignedAt,
                SpecialtyScore = (d.Specialization != null &&
                    specialtyKeywords.Any(k => d.Specialization.ToLower().Contains(k))) ? 2 : 0
            })
            .OrderByDescending(d => d.SpecialtyScore)
            .ThenBy(d => d.AssignedCount)
            .ThenBy(d => d.LastAssignedAt ?? DateTime.MinValue)
            .ToList();

        // 4. Phân công từng ảnh
        int assignedCount = 0;
        // Dùng dictionary để track số ca realtime khi phân công
        var currentCounts = sortedDoctors.ToDictionary(d => d.UserId, d => d.AssignedCount);

        foreach (var image in pendingImages)
        {
            // Chọn bác sĩ tốt nhất (re-sort theo currentCounts)
            var bestDoctor = sortedDoctors
                .OrderByDescending(d => d.SpecialtyScore)
                .ThenBy(d => currentCounts[d.UserId])
                .ThenBy(d => d.LastAssignedAt ?? DateTime.MinValue)
                .First();

            _context.ImageAssignments.Add(new ImageAssignment
            {
                ImageId    = image.Id,
                DoctorId   = bestDoctor.UserId,
                AssignedBy = adminId,
                AssignedAt = DateTime.Now,
                Status     = "pending"
            });

            image.Status = "assigned";

            _context.Notifications.Add(new Notification
            {
                UserId    = bestDoctor.UserId,
                Title     = "Ca mới được tự động phân công",
                Content   = $"Bạn được phân công xem xét ảnh #{image.Id}",
                IsRead    = false,
                CreatedAt = DateTime.Now
            });

            // Cập nhật count cho bác sĩ vừa được assign
            currentCounts[bestDoctor.UserId]++;
            assignedCount++;
        }

        await _context.SaveChangesAsync();

        return Ok(new { assignedCount, message = $"Đã tự động phân công {assignedCount} ảnh cho các bác sĩ" });
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

        if (!string.IsNullOrEmpty(req.LicenseNumber) && await _context.Doctors.AnyAsync(d => d.LicenseNumber == req.LicenseNumber))
            return BadRequest(new { message = "Số giấy phép (License Number) đã tồn tại" });

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
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
            await transaction.CommitAsync();

            return Ok(new { message = "Tạo bác sĩ thành công", userId = user.Id });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "Lỗi hệ thống khi tạo bác sĩ: " + ex.Message });
        }
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