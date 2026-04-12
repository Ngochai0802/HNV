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

        // 🔥 Lấy tên bệnh nhân
        var patient = await _context.Users.FindAsync(userId);
        var patientName = patient?.FullName ?? "Bệnh nhân";

        // 🔥 Lấy ADMIN
        var admins = await _context.Users
            .Where(u => u.Role!.RoleName == "admin" && u.IsActive && !u.IsDeleted)
            .ToListAsync();

        // 🔥 Gửi thông báo cho ADMIN
        foreach (var admin in admins)
        {
            _context.Notifications.Add(new Notification
            {
                UserId    = admin.Id,
                Title     = "Có lịch khám mới cần duyệt",
                Content   = $"{patientName} đặt lịch với BS ID {req.DoctorId} vào {req.AppointmentTime:dd/MM/yyyy HH:mm}",
                IsRead    = false,
                CreatedAt = DateTime.Now
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
            .Include(a => a.Patient).ThenInclude(p => p!.User)
            .Include(a => a.Doctor).ThenInclude(d => d!.User)
            .AsQueryable();

        if (role == "patient")
            query = query.Where(a => a.PatientId == userId);

        else if (role == "doctor")
            query = query.Where(a => a.DoctorId == userId);

        var appointments = await query
            .OrderByDescending(a => a.AppointmentTime)
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

        // 🔥 Nếu xác nhận → notify bác sĩ
        if (req.Status == "confirmed")
        {
            _context.Notifications.Add(new Notification
            {
                UserId    = appointment.DoctorId,
                Title     = "Lịch khám đã được xác nhận",
                Content   = $"Bệnh nhân {appointment.Patient!.User!.FullName} đặt lịch vào {appointment.AppointmentTime:dd/MM/yyyy HH:mm}",
                IsRead    = false,
                CreatedAt = DateTime.Now
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