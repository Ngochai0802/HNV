using MedicalDiagnosis.Core.Entities;
using MedicalDiagnosis.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MedicalDiagnosis.API.Controllers;

[ApiController]
[Route("api/doctor")]
[Authorize(Roles = "doctor")]
public class DoctorController : ControllerBase
{
    private readonly AppDbContext _context;

    public DoctorController(AppDbContext context)
    {
        _context = context;
    }

    // GET /api/doctor/assignments
    [HttpGet("assignments")]
    public async Task<IActionResult> GetAssignments([FromQuery] string? status)
    {
        var doctorId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var query = _context.ImageAssignments
            .Include(a => a.Image).ThenInclude(i => i!.Patient).ThenInclude(p => p!.User)
            .Where(a => a.DoctorId == doctorId);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(a => a.Status == status);

        var assignments = await query
            .OrderByDescending(a => a.AssignedAt)
            .Select(a => new
            {
                AssignmentId  = a.Id,
                a.Status,
                a.AssignedAt,
                Image = new
                {
                    a.Image!.Id,
                    a.Image.FileName,
                    a.Image.ImageUrl,
                    a.Image.UploadDate,
                    ImageStatus = a.Image.Status,
                    PatientName = a.Image.Patient!.User!.FullName
                }
            })
            .ToListAsync();

        return Ok(assignments);
    }

    // GET /api/doctor/images/{id}
    [HttpGet("images/{id}")]
    public async Task<IActionResult> GetImageDetail(int id)
    {
        var doctorId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // Kiểm tra bác sĩ có được phân công ảnh này không
        var assigned = await _context.ImageAssignments
            .AnyAsync(a => a.ImageId == id && a.DoctorId == doctorId);
        if (!assigned) return Forbid();

        var image = await _context.MedicalImages
            .Include(m => m.Patient).ThenInclude(p => p!.User)
            .FirstOrDefaultAsync(m => m.Id == id);
        if (image == null) return NotFound();

        var inference = await _context.AiInferences
            .Include(i => i.Model)
            .Where(i => i.ImageId == id)
            .OrderByDescending(i => i.CreatedAt)
            .FirstOrDefaultAsync();

        AiResult? result = null;
        List<AiBoundingBox> boxes = new();

        if (inference != null)
        {
            result = await _context.AiResults
                .FirstOrDefaultAsync(r => r.InferenceId == inference.Id);
            if (result != null)
                boxes = await _context.AiBoundingBoxes
                    .Where(b => b.ResultId == result.Id)
                    .ToListAsync();
        }

        var suggestions = await _context.AiSuggestions
            .Where(s => s.ImageId == id)
            .ToListAsync();

        var diagnosis = await _context.Diagnoses
            .FirstOrDefaultAsync(d => d.ImageId == id && d.DoctorId == doctorId);

        return Ok(new
        {
            Image = new
            {
                image.Id,
                image.FileName,
                image.ImageUrl,
                image.Status,
                image.UploadDate,
                PatientName = image.Patient!.User!.FullName
            },
            Inference = inference == null ? null : new
            {
                inference.Id,
                inference.Status,
                inference.InferenceTime,
                ModelName = inference.Model?.ModelName
            },
            AiResult = result == null ? null : new
            {
                result.PredictionLabel,
                result.ConfidenceScore,
                result.ProcessedImageUrl
            },
            BoundingBoxes = boxes.Select(b => new { b.X, b.Y, b.Width, b.Height }),
            Suggestions   = suggestions.Select(s => new
            {
                s.Id,
                s.SuggestedText,
                s.IsUsedByDoctor
            }),
            Diagnosis = diagnosis == null ? null : new
            {
                diagnosis.Id,
                diagnosis.DiagnosisText,
                diagnosis.FinalResult,
                diagnosis.SeverityLevel,
                diagnosis.CreatedAt
            }
        });
    }

    // POST /api/doctor/diagnoses
    [HttpPost("diagnoses")]
    public async Task<IActionResult> CreateDiagnosis([FromBody] CreateDiagnosisRequest req)
    {
        var doctorId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var assigned = await _context.ImageAssignments
            .AnyAsync(a => a.ImageId == req.ImageId && a.DoctorId == doctorId);
        if (!assigned) return Forbid();

        var diagnosis = new Diagnosis
        {
            ImageId       = req.ImageId,
            DoctorId      = doctorId,
            DiagnosisText = req.DiagnosisText,
            FinalResult   = req.FinalResult,
            SeverityLevel = req.SeverityLevel,
            CreatedAt     = DateTime.Now
        };
        _context.Diagnoses.Add(diagnosis);

        // Cập nhật status ảnh → diagnosed
        var image = await _context.MedicalImages.FindAsync(req.ImageId);
        if (image != null) image.Status = "diagnosed";

        // Cập nhật assignment → completed
        var assignment = await _context.ImageAssignments
            .FirstOrDefaultAsync(a => a.ImageId == req.ImageId && a.DoctorId == doctorId);
        if (assignment != null) assignment.Status = "completed";

        // Thông báo cho bệnh nhân
        if (image != null)
        {
            _context.Notifications.Add(new Notification
            {
                UserId    = image.PatientId,
                Title     = "Có kết quả chẩn đoán mới",
                Content   = $"Bác sĩ đã đưa ra kết luận cho ảnh #{req.ImageId}",
                IsRead    = false,
                CreatedAt = DateTime.Now
            });
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Lưu chẩn đoán thành công", diagnosisId = diagnosis.Id });
    }

    // GET /api/doctor/suggestions/{imageId}
    [HttpGet("suggestions/{imageId}")]
    public async Task<IActionResult> GetSuggestions(int imageId)
    {
        var suggestions = await _context.AiSuggestions
            .Where(s => s.ImageId == imageId)
            .Select(s => new { s.Id, s.SuggestedText, s.IsUsedByDoctor, s.CreatedAt })
            .ToListAsync();

        return Ok(suggestions);
    }

    // PATCH /api/doctor/suggestions/{id}/use
    [HttpPatch("suggestions/{id}/use")]
    public async Task<IActionResult> UseSuggestion(int id, [FromBody] UseSuggestionRequest req)
    {
        var suggestion = await _context.AiSuggestions.FindAsync(id);
        if (suggestion == null) return NotFound();

        suggestion.IsUsedByDoctor = req.IsUsed;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Cập nhật thành công" });
    }

    // GET /api/doctor/profile
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);
        if (user == null) return NotFound();

        var doctor = await _context.Doctors
            .FirstOrDefaultAsync(d => d.UserId == userId);

        return Ok(new
        {
            user.Id,
            user.FullName,
            user.Email,
            user.Username,
            Role           = user.Role!.RoleName,
            Specialization = doctor?.Specialization,
            LicenseNumber  = doctor?.LicenseNumber,
            YearsOfExperience = doctor?.YearsOfExperience
        });
    }

    // PUT /api/doctor/profile — chỉ cho sửa FullName và Email
    // Chuyên khoa, Số giấy phép, Năm kinh nghiệm do Admin quản lý
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateDoctorProfileRequest req)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound();

        user.FullName  = req.FullName ?? user.FullName;
        user.Email     = req.Email    ?? user.Email;
        user.UpdatedAt = DateTime.Now;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Cập nhật thành công" });
    }
}

public class CreateDiagnosisRequest
{
    public int     ImageId       { get; set; }
    public string? DiagnosisText { get; set; }
    public string? FinalResult   { get; set; }
    public string? SeverityLevel { get; set; }
}

public class UseSuggestionRequest
{
    public bool IsUsed { get; set; }
}

public class UpdateDoctorProfileRequest
{
    public string? FullName           { get; set; }
    public string? Email              { get; set; }
    public string? Specialization     { get; set; }
    public string? LicenseNumber      { get; set; }
    public int?    YearsOfExperience  { get; set; }
}