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
                    .Select(i => i.Status)
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
                DoctorName = diagnosis.Doctor!.User!.FullName
            },
            AiResult = aiResult
        });
    }

    // ✅ FIX BUG 1
    // GET /api/patient/doctors — chỉ trả về bác sĩ được phân công cho bệnh nhân
    [HttpGet("doctors")]
    public async Task<IActionResult> GetDoctors()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // Lấy danh sách DoctorId đã được phân công ảnh của bệnh nhân này
        var assignedDoctorIds = await _context.ImageAssignments
            .Include(a => a.Image)
            .Where(a => a.Image!.PatientId == userId)
            .Select(a => a.DoctorId)
            .Distinct()
            .ToListAsync();

        var doctors = await _context.Doctors
            .Include(d => d.User)
            .Where(d => assignedDoctorIds.Contains(d.UserId) && d.User!.IsActive && !d.User.IsDeleted)
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

    // GET /api/patient/profile
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);
        if (user == null) return NotFound();

        var patient = await _context.Patients
            .FirstOrDefaultAsync(p => p.UserId == userId);

        return Ok(new
        {
            user.Id,
            user.FullName,
            user.Email,
            user.Username,
            Role = user.Role!.RoleName,
            DateOfBirth = patient?.DateOfBirth,
            Gender      = patient?.Gender,
            Phone       = patient?.Phone,
            Address     = patient?.Address
        });
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
        user.Email     = req.Email    ?? user.Email;
        user.UpdatedAt = DateTime.Now;

        // Cập nhật Patient
        if (req.DateOfBirth.HasValue) patient.DateOfBirth = req.DateOfBirth;
        if (req.Gender  != null)     patient.Gender      = req.Gender;
        if (req.Phone   != null)     patient.Phone       = req.Phone;
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