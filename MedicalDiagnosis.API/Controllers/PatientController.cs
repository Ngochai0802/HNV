using MedicalDiagnosis.Core.Entities;
using MedicalDiagnosis.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MedicalDiagnosis.API.Controllers;

[ApiController]
[Route("api/patient")]
[Authorize(Roles = "patient")]
public class PatientController : ControllerBase
{
    private readonly AppDbContext _context;

    public PatientController(AppDbContext context)
    {
        _context = context;
    }

    // GET /api/patient/images
    [HttpGet("images")]
    public async Task<IActionResult> GetImages()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
 
        var images = await _context.MedicalImages
            .AsNoTracking()
            .Where(m => m.PatientId == userId && !m.IsDeleted)
            .OrderByDescending(m => m.UploadDate)
            .Select(m => new
            {
                m.Id,
                m.FileName,
                m.ImageUrl,
                m.Status,
                m.UploadDate,
                AiStatus = _context.AiInferences
                    .Where(i => i.ImageId == m.Id)
                    .OrderByDescending(i => i.CreatedAt)
                    .Select(i => i.Status)
                    .FirstOrDefault(),
                AiResult = _context.AiResults
                    .Where(r => _context.AiInferences.Any(i => i.Id == r.InferenceId && i.ImageId == m.Id && i.Status == "success"))
                    .Select(r => r.PredictionLabel)
                    .FirstOrDefault(),
                HasDiagnosis = _context.Diagnoses.Any(d => d.ImageId == m.Id)
            })
            .ToListAsync();
 
        return Ok(images);
    }

    // GET /api/patient/images/{id}/diagnosis
    [HttpGet("images/{id}/diagnosis")]
    public async Task<IActionResult> GetDiagnosis(int id)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var image = await _context.MedicalImages
            .FirstOrDefaultAsync(m => m.Id == id && m.PatientId == userId);
        if (image == null) return NotFound();

        var diagnosis = await _context.Diagnoses
            .Include(d => d.Doctor).ThenInclude(d => d!.User)
            .FirstOrDefaultAsync(d => d.ImageId == id);

        if (diagnosis == null)
            return Ok(new { message = "Chưa có kết quả chẩn đoán" });

        var aiResult = await _context.AiInferences
            .Where(i => i.ImageId == id)
            .Join(_context.AiResults, i => i.Id, r => r.InferenceId,
                (i, r) => new { r.PredictionLabel, r.ConfidenceScore })
            .FirstOrDefaultAsync();

        return Ok(new
        {
            Image = new { image.Id, image.FileName, image.ImageUrl, image.UploadDate },
            Diagnosis = new
            {
                diagnosis.DiagnosisText,
                diagnosis.FinalResult,
                diagnosis.SeverityLevel,
                diagnosis.CreatedAt,
                DoctorId = diagnosis.DoctorId,
                DoctorName = diagnosis.Doctor?.User?.FullName ?? "Bác sĩ"
            },
            AiResult = aiResult
        });
    }

    // GET /api/patient/doctors — Danh sách tất cả bác sĩ để đặt lịch khám
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
                d.Specialization,
                d.YearsOfExperience
            })
            .ToListAsync();

        return Ok(doctors);
    }

    // GET /api/patient/assigned-doctors — Danh sách bác sĩ phụ trách ca bệnh của bệnh nhân này
    [HttpGet("assigned-doctors")]
    public async Task<IActionResult> GetAssignedDoctors()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var assignedDoctors = await _context.ImageAssignments
            .Where(a => a.Image!.PatientId == userId)
            .Select(a => a.Doctor)
            .Distinct()
            .Where(d => d!.User!.IsActive && !d.User.IsDeleted)
            .Select(d => new
            {
                d!.UserId,
                d.User!.FullName,
                d.Specialization,
                d.YearsOfExperience
            })
            .ToListAsync();

        return Ok(assignedDoctors);
    }

    // GET /api/patient/profile
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // Lấy User + Role + Patient trong 1 LEFT JOIN query
        var profile = await (
            from u in _context.Users
            where u.Id == userId && !u.IsDeleted
            join r in _context.Roles on u.RoleId equals r.Id into roles
            from role in roles.DefaultIfEmpty()
            join p in _context.Patients on u.Id equals p.UserId into patients
            from pat in patients.DefaultIfEmpty()
            select new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.Username,
                Role        = role != null ? role.RoleName : null,
                DateOfBirth = pat != null ? pat.DateOfBirth : (DateTime?)null,
                Gender      = pat != null ? pat.Gender      : null,
                Phone       = pat != null ? pat.Phone       : null,
                Address     = pat != null ? pat.Address     : null
            }
        ).AsNoTracking().FirstOrDefaultAsync();

        if (profile == null) return NotFound();

        return Ok(profile);
    }

    // PUT /api/patient/profile
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdatePatientProfileRequest req)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound();

        var patient = await _context.Patients.FindAsync(userId);
        if (patient == null) return NotFound();

        // Cập nhật User
        user.FullName  = req.FullName ?? user.FullName;
        
        if (req.Email != null && req.Email != user.Email)
        {
            bool emailExists = await _context.Users
                .AsNoTracking()
                .AnyAsync(u => u.Email == req.Email && u.Id != userId);

            if (emailExists)
                return BadRequest(new { message = "Email đã được sử dụng" });

            user.Email = req.Email;
        }
        
        user.UpdatedAt = DateTime.Now;

        // Cập nhật Patient
        // Cập nhật Patient
if (req.DateOfBirth.HasValue) patient.DateOfBirth = req.DateOfBirth;
if (req.Gender  != null)     patient.Gender      = req.Gender;

if (req.Phone != null && req.Phone != patient.Phone)
{
    bool phoneExists = await _context.Patients
        .AsNoTracking()
        .AnyAsync(p => p.Phone == req.Phone && p.UserId != userId);

    if (phoneExists)
        return BadRequest(new { message = "Số điện thoại đã được sử dụng" });

    patient.Phone = req.Phone;
}

if (req.Address != null)     patient.Address     = req.Address;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Cập nhật thành công" });
    }

    // ✅ FIX BUG 2 (QUAN TRỌNG)
    // GET /api/patient/my-doctor
    [HttpGet("my-doctor")]
    public async Task<IActionResult> GetMyDoctor()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var assignment = await _context.ImageAssignments
            .Include(a => a.Doctor).ThenInclude(d => d!.User)
            .Include(a => a.Image)
            .Where(a => a.Image!.PatientId == userId)
            .OrderByDescending(a => a.AssignedAt)
            .FirstOrDefaultAsync();

        if (assignment == null)
            return Ok(null);

        return Ok(new
        {
            DoctorId   = assignment.DoctorId,
            DoctorName = assignment.Doctor!.User!.FullName,
            ImageId    = assignment.ImageId,
            ImageName  = assignment.Image!.FileName
        });
    }
}

public class UpdatePatientProfileRequest
{
    public string?    FullName    { get; set; }
    public string?    Email       { get; set; }
    public DateTime?  DateOfBirth { get; set; }
    public string?    Gender      { get; set; }
    public string?    Phone       { get; set; }
    public string?    Address     { get; set; }
}