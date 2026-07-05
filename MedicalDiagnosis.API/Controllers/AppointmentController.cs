using MedicalDiagnosis.Core.Entities;
using MedicalDiagnosis.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MedicalDiagnosis.API.Controllers;

[ApiController]
[Route("api/appointments")]
[Authorize]
public class AppointmentController : ControllerBase
{
    private readonly AppDbContext _context;

    public AppointmentController(AppDbContext context)
    {
        _context = context;
    }

    // ================================
    // POST /api/appointments
    // Patient đặt lịch → gửi cho ADMIN
    // ================================
    [HttpPost]
    [Authorize(Roles = "patient")]
    public async Task<IActionResult> Create([FromBody] CreateAppointmentRequest req)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // Kiểm tra giới hạn chống Spam (>= 5 pending)
        var pendingCount = await _context.Appointments.CountAsync(a => a.PatientId == userId && a.Status == "pending");
        if (pendingCount >= 5)
            return BadRequest(new { message = "Bạn đã vượt quá giới hạn 5 lịch hẹn chờ duyệt" });

        // Kiểm tra ràng buộc thời gian (cách tối thiểu 1 tiếng)
        if (req.AppointmentTime < DateTime.Now.AddHours(1))
            return BadRequest(new { message = "Thời gian hẹn phải cách thời điểm hiện tại ít nhất 1 giờ." });

        // Kiểm tra trùng lịch hẹn (Conflict gap 30 phút)
        var isBooked = await _context.Appointments
            .AnyAsync(a => a.DoctorId == req.DoctorId 
                        && a.Status != "cancelled" 
                        && a.AppointmentTime >= req.AppointmentTime.AddMinutes(-30)
                        && a.AppointmentTime <= req.AppointmentTime.AddMinutes(30));
                        
        if (isBooked)
            return BadRequest(new { message = "Giờ hẹn trùng với lịch bận của bác sĩ" });

        var appointment = new Appointment
        {
            PatientId       = userId,
            DoctorId        = req.DoctorId,
            AppointmentTime = req.AppointmentTime,
            Status          = "pending",
            Note            = req.Note,
            CreatedAt       = DateTime.Now
        };

        _context.Appointments.Add(appointment);

        // Tuần tự — DbContext KHÔNG thread-safe, không dùng Task.WhenAll
        var patientName = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.FullName)
            .FirstOrDefaultAsync() ?? "Bệnh nhân";

        var adminIds = await _context.Users
            .AsNoTracking()
            .Where(u => u.Role!.RoleName == "admin" && u.IsActive && !u.IsDeleted)
            .Select(u => u.Id)
            .ToListAsync();

        // 🔥 Gửi thông báo cho ADMIN
        foreach (var adminId in adminIds)
        {
            _context.Notifications.Add(new Notification
            {
                UserId     = adminId,
                Title      = "Có lịch khám mới cần duyệt",
                Content    = $"{patientName} đặt lịch với BS ID {req.DoctorId} vào {req.AppointmentTime:dd/MM/yyyy HH:mm}",
                IsRead     = false,
                RelatedUrl = "/admin/appointments",
                CreatedAt  = DateTime.Now
            });
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Đặt lịch thành công! Chờ admin xác nhận.",
            appointmentId = appointment.Id
        });
    }

    // ================================
    // GET /api/appointments
    // Patient / Doctor xem lịch của mình
    // ================================
    [HttpGet]
    public async Task<IActionResult> GetAppointments()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var role   = User.FindFirst(ClaimTypes.Role)!.Value;

        var query = _context.Appointments
            .AsNoTracking()
            .Include(a => a.Patient).ThenInclude(p => p!.User)
            .Include(a => a.Doctor).ThenInclude(d => d!.User)
            .AsQueryable();

        if (role == "patient")
            query = query.Where(a => a.PatientId == userId);

        else if (role == "doctor")
            query = query.Where(a => a.DoctorId == userId && a.Status != "pending");

        var appointments = await query
            .OrderByDescending(a => a.AppointmentTime)
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

    // ================================
    // PATCH /api/appointments/{id}/status
    // Doctor/Admin đổi trạng thái (optional)
    // ================================
    [HttpPatch("{id}/status")]
    [Authorize(Roles = "doctor,admin")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusRequest req)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Patient).ThenInclude(p => p!.User)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appointment == null) return NotFound();

        appointment.Status = req.Status;

        // 🔥 Nếu xác nhận → notify bác sĩ và bệnh nhân
        if (req.Status == "confirmed")
        {
            // Báo cho Bác sĩ
            _context.Notifications.Add(new Notification
            {
                UserId     = appointment.DoctorId,
                Title      = "Lịch khám đã được xác nhận",
                Content    = $"Bệnh nhân {appointment.Patient!.User!.FullName} đặt lịch vào {appointment.AppointmentTime:dd/MM/yyyy HH:mm}",
                IsRead     = false,
                RelatedUrl = "/doctor/appointments",
                CreatedAt  = DateTime.Now
            });

            // Báo cho Bệnh nhân
            _context.Notifications.Add(new Notification
            {
                UserId     = appointment.PatientId,
                Title      = "Lịch hẹn đã được duyệt",
                Content    = $"Lịch hẹn lúc {appointment.AppointmentTime:HH:mm dd/MM/yyyy} đã được xác nhận.",
                IsRead     = false,
                RelatedUrl = "/patient/appointments",
                CreatedAt  = DateTime.Now
            });
        }
        else if (req.Status == "cancelled")
        {
            // Báo cho Bệnh nhân khi bị hủy
            _context.Notifications.Add(new Notification
            {
                UserId     = appointment.PatientId,
                Title      = "Lịch hẹn bị hủy",
                Content    = $"Lịch hẹn lúc {appointment.AppointmentTime:HH:mm dd/MM/yyyy} đã bị từ chối/hủy.",
                IsRead     = false,
                RelatedUrl = "/patient/appointments",
                CreatedAt  = DateTime.Now
            });
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Cập nhật trạng thái thành công" });
    }
}

// ================================
// DTOs
// ================================
public class CreateAppointmentRequest
{
    public int      DoctorId        { get; set; }
    public DateTime AppointmentTime { get; set; }
    public string?  Note            { get; set; }
}

public class UpdateStatusRequest
{
    public string Status { get; set; } = null!;
}