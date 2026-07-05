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
            .AsNoTracking()
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
                ImageId = a.Image!.Id,
                FileName = a.Image.FileName,
                ImageUrl = a.Image.ImageUrl,
                UploadDate = a.Image.UploadDate,
                ImageStatus = a.Image.Status,
                PatientName = a.Image.Patient!.User!.FullName
            })
            .ToListAsync();

        var imageIds = assignments.Select(a => a.ImageId).Distinct().ToList();
        
        var aiResults = await _context.AiInferences
            .Where(i => imageIds.Contains(i.ImageId) && i.Status == "success")
            .Join(_context.AiResults, 
                  i => i.Id, 
                  r => r.InferenceId, 
                  (i, r) => new { i.ImageId, r.PredictionLabel, r.ConfidenceScore, r.SeverityLevel, i.CreatedAt })
            .ToListAsync();

        var latestAiResults = aiResults
            .GroupBy(r => r.ImageId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(r => r.CreatedAt).FirstOrDefault());

        var response = assignments.Select(a => new
        {
            a.AssignmentId,
            a.Status,
            a.AssignedAt,
            Image = new
            {
                Id = a.ImageId,
                a.FileName,
                a.ImageUrl,
                a.UploadDate,
                a.ImageStatus,
                a.PatientName,
                AiResult = latestAiResults.ContainsKey(a.ImageId) ? new 
                {
                    latestAiResults[a.ImageId]!.PredictionLabel,
                    latestAiResults[a.ImageId]!.ConfidenceScore,
                    latestAiResults[a.ImageId]!.SeverityLevel
                } : null
            }
        });

        return Ok(response);
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

        // Query 1: Ảnh + thông tin bệnh nhân
        var image = await _context.MedicalImages
            .AsNoTracking()
            .Include(m => m.Patient).ThenInclude(p => p!.User)
            .FirstOrDefaultAsync(m => m.Id == id);
        if (image == null) return NotFound();

        // Query 2: Inference mới nhất + Model + Result trong 1 join
        var inferenceData = await (
            from i in _context.AiInferences
            where i.ImageId == id
            orderby i.CreatedAt descending
            join mod in _context.AiModels on i.ModelId equals mod.Id into models
            from model in models.DefaultIfEmpty()
            join r in _context.AiResults on i.Id equals r.InferenceId into results
            from result in results.DefaultIfEmpty()
            select new
            {
                InferenceId     = i.Id,
                InferenceStatus = i.Status,
                i.InferenceTime,
                ModelName       = model != null ? model.ModelName : null,
                ResultId            = result != null ? (int?)result.Id : null,
                PredictionLabel     = result != null ? result.PredictionLabel : null,
                ConfidenceScore     = result != null ? (double?)result.ConfidenceScore : null,
                ProcessedImageUrl   = result != null ? result.ProcessedImageUrl : null
            }
        ).AsNoTracking().FirstOrDefaultAsync();

        // Query 3: Bounding boxes (chỉ khi có result)
        List<AiBoundingBox> boxes = inferenceData?.ResultId != null
            ? await _context.AiBoundingBoxes
                .AsNoTracking()
                .Where(b => b.ResultId == inferenceData.ResultId)
                .ToListAsync()
            : new();

        // Query 4 + 5: Suggestions và Diagnosis tuần tự (DbContext không thread-safe)
        var suggestions = await _context.AiSuggestions
            .AsNoTracking()
            .Where(s => s.ImageId == id)
            .Select(s => new { s.Id, s.SuggestedText, s.IsUsedByDoctor })
            .ToListAsync();

        var diagnosis = await _context.Diagnoses
            .AsNoTracking()
            .Where(d => d.ImageId == id && d.DoctorId == doctorId)
            .Select(d => new
            {
                d.Id,
                d.DoctorId,
                d.DiagnosisText,
                d.FinalResult,
                d.SeverityLevel,
                d.CreatedAt
            })
            .FirstOrDefaultAsync();

        string severity       = "safe";
        string severityText   = "Chưa có kết quả";
        string recommendation = "Đang chờ hệ thống phân tích hình ảnh.";

        if (inferenceData?.ResultId != null)
        {
            severityText   = "An toàn";
            recommendation = "Kết quả sơ bộ cho thấy chưa có dấu hiệu bất thường rõ rệt.";

            if (inferenceData.ConfidenceScore > 0.8 && inferenceData.PredictionLabel != "Bình thường")
            {
                severity       = "danger";
                severityText   = "Nguy hiểm";
                recommendation = "Dấu hiệu bệnh lý rõ rệt. Bạn cần nhập viện hoặc liên hệ cấp cứu ngay.";
            }
            else if (inferenceData.ConfidenceScore > 0.4 && inferenceData.PredictionLabel != "Bình thường")
            {
                severity       = "warning";
                severityText   = "Cần khám ngay";
                recommendation = "Phát hiện dấu hiệu nghi vấn. Hãy đặt lịch hẹn với bác sĩ chuyên khoa sớm nhất.";
            }
            else if (inferenceData.PredictionLabel != "Bình thường")
            {
                severity       = "warning";
                severityText   = "Cần kiểm tra thêm";
                recommendation = "Chưa thấy dấu hiệu rõ ràng, cần đi kiểm tra tại bệnh viện để xác định chính xác.";
            }
        }

        return Ok(new
        {
            Image = new
            {
                image.Id,
                image.FileName,
                image.ImageUrl,
                image.Status,
                image.UploadDate,
                PatientId = image.PatientId,
                PatientName = image.Patient!.User!.FullName
            },
            Inference = inferenceData == null ? null : new
            {
                Id        = inferenceData.InferenceId,
                Status    = inferenceData.InferenceStatus,
                inferenceData.InferenceTime,
                ModelName = inferenceData.ModelName
            },
            AiResult = inferenceData?.ResultId == null ? null : new
            {
                PredictionLabel   = inferenceData.PredictionLabel,
                ConfidenceScore   = inferenceData.ConfidenceScore,
                ProcessedImageUrl = inferenceData.ProcessedImageUrl,
                Severity          = severity,
                SeverityText      = severityText,
                Recommendation    = recommendation
            },
            BoundingBoxes = boxes.Select(b => new { b.X, b.Y, b.Width, b.Height }),
            Suggestions   = suggestions,
            Diagnosis     = diagnosis
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

        // 1. Validation Logic
        if (string.IsNullOrWhiteSpace(req.FinalResult))
            return BadRequest(new { message = "Kết quả chẩn đoán không được để trống" });
            
        req.FinalResult = req.FinalResult.Trim();
        if (req.FinalResult.Length > 2000)
            return BadRequest(new { message = "Kết quả chẩn đoán không được vượt quá 2000 ký tự" });

        if (string.IsNullOrWhiteSpace(req.SeverityLevel))
            return BadRequest(new { message = "Mức độ bệnh lý không được để trống" });

        var allowedSeverities = new[] { "low", "medium", "high", "critical" };
        if (!allowedSeverities.Contains(req.SeverityLevel))
            return BadRequest(new { message = "Mức độ bệnh lý không hợp lệ" });

        if (!string.IsNullOrWhiteSpace(req.DiagnosisText))
        {
            req.DiagnosisText = req.DiagnosisText.Trim();
            if (req.DiagnosisText.Length > 1000)
                return BadRequest(new { message = "Ghi chú không được vượt quá 1000 ký tự" });
        }
        else
        {
            req.DiagnosisText = null;
        }

        var diagnosis = await _context.Diagnoses
            .FirstOrDefaultAsync(d => d.ImageId == req.ImageId && d.DoctorId == doctorId);

        bool isNew = false;
        if (diagnosis == null)
        {
            isNew = true;
            diagnosis = new Diagnosis
            {
                ImageId       = req.ImageId,
                DoctorId      = doctorId,
                CreatedAt     = DateTime.Now
            };
            _context.Diagnoses.Add(diagnosis);
        }

        diagnosis.DiagnosisText = req.DiagnosisText;
        diagnosis.FinalResult   = req.FinalResult;
        diagnosis.SeverityLevel = req.SeverityLevel;
        diagnosis.CreatedAt     = DateTime.Now; // Cập nhật lại thời gian để Frontend thấy mới nhất

        // Cập nhật status ảnh → diagnosed
        var image = await _context.MedicalImages.FindAsync(req.ImageId);
        if (image != null) image.Status = "diagnosed";

        // Cập nhật assignment → completed
        var assignment = await _context.ImageAssignments
            .FirstOrDefaultAsync(a => a.ImageId == req.ImageId && a.DoctorId == doctorId);
        if (assignment != null) assignment.Status = "completed";

        // Thông báo cho bệnh nhân (chỉ khi tạo mới để tránh spam)
        if (isNew && image != null)
        {
            var doctorName = await _context.Users
                .Where(u => u.Id == doctorId)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync() ?? "Bác sĩ";

            _context.Notifications.Add(new Notification
            {
                UserId     = image.PatientId,
                Title      = "Có kết quả chẩn đoán mới",
                Content    = $"Bác sĩ {doctorName} đã hoàn thành chẩn đoán ảnh X-quang {image.FileName} của bạn. Vui lòng kiểm tra kết quả.",
                IsRead     = false,
                RelatedUrl = $"/patient/images/{req.ImageId}",
                CreatedAt  = DateTime.Now
            });
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = isNew ? "Lưu chẩn đoán thành công" : "Cập nhật chẩn đoán thành công", diagnosisId = diagnosis.Id });
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

        // Lấy thông tin User và Doctor trong 1 query LEFT JOIN
        var profile = await (
            from u in _context.Users
            where u.Id == userId && !u.IsDeleted
            join role in _context.Roles on u.RoleId equals role.Id into roles
            from r in roles.DefaultIfEmpty()
            join d in _context.Doctors on u.Id equals d.UserId into doctors
            from doc in doctors.DefaultIfEmpty()
            select new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.Username,
                Role              = r != null ? r.RoleName : null,
                Specialization    = doc != null ? doc.Specialization : null,
                LicenseNumber     = doc != null ? doc.LicenseNumber : null,
                YearsOfExperience = doc != null ? (int?)doc.YearsOfExperience : null
            }
        ).AsNoTracking().FirstOrDefaultAsync();

        if (profile == null) return NotFound();

        return Ok(profile);
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateDoctorProfileRequest req)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound();

        // 1. Kiểm tra bắt buộc và Trim
        if (string.IsNullOrWhiteSpace(req.FullName))
            return BadRequest(new { message = "Họ và tên không được để trống" });
        if (string.IsNullOrWhiteSpace(req.Email))
            return BadRequest(new { message = "Email không được để trống" });

        var newFullName = req.FullName.Trim();
        var newEmail = req.Email.Trim();

        // 2. Kiểm tra Regex FullName (chỉ chữ cái và khoảng trắng)
        if (!System.Text.RegularExpressions.Regex.IsMatch(newFullName, @"^[a-zA-ZÀ-ỹ\s]+$"))
            return BadRequest(new { message = "Họ và tên chỉ được chứa chữ cái và khoảng trắng" });

        // 3. Kiểm tra Regex Email
        if (!System.Text.RegularExpressions.Regex.IsMatch(newEmail, @"^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$"))
            return BadRequest(new { message = "Email không đúng định dạng" });

        // 4. Kiểm tra dữ liệu có thực sự thay đổi không (Tiết kiệm tài nguyên)
        if (newFullName == user.FullName && newEmail == user.Email)
            return Ok(new { message = "Cập nhật thành công" }); // Trả về luôn không gọi SaveChanges

        // 5. Kiểm tra trùng lặp Email
        if (newEmail != user.Email)
        {
            var emailExists = await _context.Users.AnyAsync(u => u.Email == newEmail && u.Id != userId && !u.IsDeleted);
            if (emailExists)
                return BadRequest(new { message = "Email này đã được sử dụng bởi một tài khoản khác" });
        }

        user.FullName  = newFullName;
        user.Email     = newEmail;
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