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
    // QUẢN LÝ LỊCH KHÁM
    // =========================================

    // GET /api/admin/appointments
    [HttpGet("appointments")]
    public async Task<IActionResult> GetAppointments()
    {
        var appointments = await _context.Appointments
            .AsNoTracking()
            .Include(a => a.Patient).ThenInclude(p => p!.User)
            .Include(a => a.Doctor).ThenInclude(d => d!.User)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                a.Id,
                a.AppointmentTime,
                a.Status,
                a.Note,
                a.CancelReason,
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

        appointment.Status = "confirmed";

        _context.Notifications.Add(new Notification
        {
            UserId     = appointment.DoctorId,
            Title      = "Lịch khám mới đã được xác nhận",
            Content    = $"Bệnh nhân {appointment.Patient!.User!.FullName} đặt lịch vào {appointment.AppointmentTime:dd/MM/yyyy HH:mm}",
            IsRead     = false,
            RelatedUrl = "/doctor/appointments",
            CreatedAt  = DateTime.Now
        });

        _context.Notifications.Add(new Notification
        {
            UserId     = appointment.PatientId,
            Title      = "Lịch hẹn đã được duyệt",
            Content    = $"Lịch hẹn lúc {appointment.AppointmentTime:HH:mm dd/MM/yyyy} đã được xác nhận.",
            IsRead     = false,
            RelatedUrl = "/patient/appointments",
            CreatedAt  = DateTime.Now
        });

        await _context.SaveChangesAsync();

        return Ok(new { message = "Đã xác nhận lịch khám" });
    }

    public class RejectAppointmentRequest
    {
        public string Reason { get; set; } = string.Empty;
    }

    // PATCH /api/admin/appointments/{id}/reject
    [HttpPatch("appointments/{id}/reject")]
    public async Task<IActionResult> RejectAppointment(int id, [FromBody] RejectAppointmentRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Reason))
            return BadRequest(new { message = "Vui lòng nhập lý do từ chối" });

        var appointment = await _context.Appointments
            .Include(a => a.Patient).ThenInclude(p => p!.User)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appointment == null)
            return NotFound(new { message = "Không tìm thấy lịch khám" });

        if (appointment.Status != "pending")
            return BadRequest(new { message = "Chỉ có thể từ chối lịch khám đang chờ duyệt" });

        appointment.Status = "cancelled";
        appointment.CancelReason = req.Reason;

        _context.Notifications.Add(new Notification
        {
            UserId     = appointment.PatientId,
            Title      = "Lịch khám đã bị từ chối",
            Content    = $"Lịch khám ngày {appointment.AppointmentTime:dd/MM/yyyy HH:mm} của bạn đã bị từ chối. Lý do: {req.Reason}",
            IsRead     = false,
            RelatedUrl = "/patient/appointments",
            CreatedAt  = DateTime.Now
        });

        await _context.SaveChangesAsync();

        return Ok(new { message = "Đã từ chối lịch khám" });
    }

    // =========================================
    // IMAGE MANAGEMENT
    // =========================================

    // GET /api/admin/images?status=pending
    [HttpGet("images")]
    public async Task<IActionResult> GetImages([FromQuery] string? status)
    {
        var assignments = await _context.ImageAssignments
            .AsNoTracking()
            .Include(a => a.Doctor).ThenInclude(d => d!.User)
            .ToListAsync();
            
        var assignmentMap = assignments.GroupBy(a => a.ImageId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(a => a.AssignedAt).First());

        var query = _context.MedicalImages
            .AsNoTracking()
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
                PatientName = m.Patient!.User!.FullName
            })
            .ToListAsync();

        var result = images.Select(m => {
            var hasAssignment = assignmentMap.TryGetValue(m.Id, out var assignment);
            return new
            {
                m.Id,
                m.FileName,
                m.ImageUrl,
                m.Status,
                m.UploadDate,
                m.PatientName,
                IsAssigned = hasAssignment,
                AssignedDoctorId = hasAssignment ? assignment!.DoctorId : (int?)null,
                AssignedDoctorName = hasAssignment ? assignment!.Doctor!.User!.FullName : null
            };
        }).ToList();

        return Ok(result);
    }

    [HttpGet("doctors")]

    public async Task<IActionResult> GetDoctors()
    {
        // Lấy số ca pending của từng bác sĩ trong 1 query GROUP BY
        var assignedCounts = await _context.ImageAssignments
            .AsNoTracking()
            .Where(a => a.Status == "pending")
            .GroupBy(a => a.DoctorId)
            .Select(g => new { DoctorId = g.Key, Count = g.Count() })
            .ToListAsync();

        var countLookup = assignedCounts.ToDictionary(x => x.DoctorId, x => x.Count);

        var doctors = await _context.Doctors
            .AsNoTracking()
            .Include(d => d.User)
            .Where(d => d.User!.IsActive && !d.User.IsDeleted)
            .Select(d => new
            {
                d.UserId,
                d.User!.FullName,
                d.User.Email,
                d.Specialization,
                d.LicenseNumber,
                d.YearsOfExperience
            })
            .ToListAsync();

        // Ghép AssignedCount trong memory (không có N+1)
        var result = doctors.Select(d => new
        {
            d.UserId,
            d.FullName,
            d.Email,
            d.Specialization,
            d.LicenseNumber,
            d.YearsOfExperience,
            AssignedCount = countLookup.GetValueOrDefault(d.UserId, 0)
        });

        return Ok(result);
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

        var existingAssignment = await _context.ImageAssignments
            .FirstOrDefaultAsync(a => a.ImageId == id && a.DoctorId == req.DoctorId);
        if (existingAssignment != null)
            return BadRequest(new { message = "Ảnh này đã được phân công cho bác sĩ này rồi!" });

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
            UserId     = req.DoctorId,
            Title      = "Ca mới được phân công",
            Content    = $"Bạn được phân công xem xét ảnh #{id}",
            IsRead     = false,
            RelatedUrl = $"/doctor/cases/{id}",
            CreatedAt  = DateTime.Now
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
            .Where(m => (m.Status == "pending" || m.Status == "processed") && !m.IsDeleted && !assignedImageIds.Contains(m.Id))
            .OrderBy(m => m.UploadDate)
            .ToListAsync();

        if (pendingImages.Count == 0)
            return Ok(new { assignedCount = 0, message = "Không có ảnh nào cần phân công" });

        // 2. Lấy danh sách bác sĩ eligible cùng với số ca pending trong 1 pass
        var pendingCountsRaw = await _context.ImageAssignments
            .AsNoTracking()
            .Where(a => a.Status != "completed")
            .GroupBy(a => a.DoctorId)
            .Select(g => new { DoctorId = g.Key, Count = g.Count() })
            .ToListAsync();

        var lastAssignedRaw = await _context.ImageAssignments
            .AsNoTracking()
            .GroupBy(a => a.DoctorId)
            .Select(g => new { DoctorId = g.Key, LastAt = g.Max(a => a.AssignedAt) })
            .ToListAsync();

        var pendingCountMap = pendingCountsRaw.ToDictionary(x => x.DoctorId, x => x.Count);
        var lastAssignedMap = lastAssignedRaw.ToDictionary(x => x.DoctorId, x => x.LastAt);

        var eligibleDoctors = await _context.Doctors
            .AsNoTracking()
            .Include(d => d.User)
            .Where(d => d.User!.IsActive && !d.User.IsDeleted)
            .Select(d => new
            {
                d.UserId,
                d.User!.FullName,
                d.Specialization
            })
            .ToListAsync();

        // Ghép count trong memory
        var eligibleDoctorsWithCount = eligibleDoctors.Select(d => new
        {
            d.UserId,
            d.FullName,
            d.Specialization,
            AssignedCount  = pendingCountMap.GetValueOrDefault(d.UserId, 0),
            LastAssignedAt = lastAssignedMap.TryGetValue(d.UserId, out var la) ? (DateTime?)la : null
        }).ToList();

        if (eligibleDoctorsWithCount.Count == 0)
            return BadRequest(new { message = "Không có bác sĩ khả dụng" });

        // 3. Sắp xếp theo tiêu chí ưu tiên
        var specialtyKeywords = new[] { "phổi", "hô hấp", "x-quang", "chẩn đoán hình ảnh" };

        var sortedDoctors = eligibleDoctorsWithCount
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
        var currentCounts = sortedDoctors.ToDictionary(d => d.UserId, d => d.AssignedCount);

        foreach (var image in pendingImages)
        {
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
                UserId     = bestDoctor.UserId,
                Title      = "Ca mới được tự động phân công",
                Content    = $"Bạn được phân công xem xét ảnh #{image.Id}",
                IsRead     = false,
                RelatedUrl = $"/doctor/cases/{image.Id}",
                CreatedAt  = DateTime.Now
            });

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
