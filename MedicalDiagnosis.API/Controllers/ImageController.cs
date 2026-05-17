using MedicalDiagnosis.API.Services;
using MedicalDiagnosis.Core.DTOs;
using MedicalDiagnosis.Core.Entities;
using MedicalDiagnosis.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace MedicalDiagnosis.API.Controllers;

[ApiController]
[Route("api/images")]
[Authorize]
public class ImageController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _env;
    private readonly HttpClient _httpClient;
    private readonly AutoAssignService _autoAssign;
    private readonly IConfiguration _configuration;

    public ImageController(AppDbContext context, IWebHostEnvironment env,
        IHttpClientFactory httpClientFactory, AutoAssignService autoAssign,
        IConfiguration configuration)
    {
        _context       = context;
        _env           = env;
        _httpClient    = httpClientFactory.CreateClient("AI");
        _autoAssign    = autoAssign;
        _configuration = configuration;
    }

    // POST /api/images/upload
    [HttpPost("upload")]
    [Authorize(Roles = "patient")]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Vui lòng chọn file ảnh" });

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/jpg" };
        if (!allowedTypes.Contains(file.ContentType))
            return BadRequest(new { message = "Chỉ chấp nhận file JPG, PNG" });

        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var webRoot      = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var uploadFolder = Path.Combine(webRoot, "uploads", userId.ToString());
        Directory.CreateDirectory(uploadFolder);

        var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(uploadFolder, fileName);
        var imageUrl = $"/uploads/{userId}/{fileName}";

        using (var stream = new FileStream(filePath, FileMode.Create))
            await file.CopyToAsync(stream);

        var aiModel = await _context.AiModels.FirstOrDefaultAsync(m => m.IsActive);
        if (aiModel == null)
            return StatusCode(500, new { message = "Không tìm thấy AI model" });

        var image = new MedicalImage
        {
            PatientId  = userId,
            UploadedBy = userId,
            ImageUrl   = imageUrl,
            FileName   = file.FileName,
            FileSize   = file.Length,
            UploadDate = DateTime.Now,
            Status     = "pending"
        };
        _context.MedicalImages.Add(image);
        await _context.SaveChangesAsync();

        var inference = new AiInference
        {
            ImageId   = image.Id,
            ModelId   = aiModel.Id,
            Status    = "pending",
            CreatedAt = DateTime.Now
        };
        _context.AiInferences.Add(inference);
        await _context.SaveChangesAsync();

        // Gọi AI service bất đồng bộ
        _ = CallAiServiceAsync(image.Id, inference.Id);

        // Tự động phân công nếu chế độ đang BẬT
        if (_autoAssign.IsEnabled)
            await AutoAssignImageAsync(image);

        return Ok(new { message = "Upload thành công", imageId = image.Id });
    }

    // GET /api/images
    [HttpGet]
    [Authorize(Roles = "patient")]
    public async Task<IActionResult> GetMyImages()
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
                    .FirstOrDefault()
            })
            .ToListAsync();

        return Ok(images);
    }

    // GET /api/images/{id}
    [HttpGet("{id}")]
    [Authorize(Roles = "patient,doctor,admin")]
    public async Task<IActionResult> GetImageDetail(int id)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var role   = User.FindFirst(ClaimTypes.Role)!.Value;

        var image = await _context.MedicalImages
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted);

        if (image == null) return NotFound();

        if (role == "patient" && image.PatientId != userId)
            return Forbid();

        var inference = await _context.AiInferences
            .AsNoTracking()
            .Include(i => i.Model)
            .Where(i => i.ImageId == id)
            .OrderByDescending(i => i.CreatedAt)
            .FirstOrDefaultAsync();

        AiResult? result = null;
        List<AiBoundingBox> boxes = new();

        // Khởi tạo giá trị mặc định severity
        string severity        = "safe";
        string severityText    = "Chưa có kết quả";
        string recommendation  = "Đang chờ hệ thống phân tích hình ảnh.";

        if (inference != null)
        {
            result = await _context.AiResults
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.InferenceId == inference.Id);

            if (result != null)
            {
                boxes = await _context.AiBoundingBoxes
                    .Where(b => b.ResultId == result.Id)
                    .ToListAsync();

                severityText   = "An toàn";
                recommendation = "Kết quả sơ bộ cho thấy chưa có dấu hiệu bất thường rõ rệt.";

                if (result.ConfidenceScore > 0.8 && result.PredictionLabel != "Bình thường")
                {
                    severity       = "danger";
                    severityText   = "Nguy hiểm";
                    recommendation = "Dấu hiệu bệnh lý rõ rệt. Bạn cần nhập viện hoặc liên hệ cấp cứu ngay.";
                }
                else if (result.ConfidenceScore > 0.4 && result.PredictionLabel != "Bình thường")
                {
                    severity       = "warning";
                    severityText   = "Cần khám ngay";
                    recommendation = "Phát hiện dấu hiệu nghi vấn. Hãy đặt lịch hẹn với bác sĩ chuyên khoa sớm nhất.";
                }
            }
        }

        var diagnosis = await _context.Diagnoses
            .Include(d => d.Doctor).ThenInclude(d => d!.User)
            .FirstOrDefaultAsync(d => d.ImageId == id);

        var suggestions = await _context.AiSuggestions
            .Where(s => s.ImageId == id)
            .ToListAsync();

        return Ok(new
        {
            image.Id,
            image.FileName,
            image.ImageUrl,
            image.Status,
            image.UploadDate,
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
                result.ProcessedImageUrl,
                result.HeatmapBase64,
                Severity       = severity,
                SeverityText   = severityText,
                Recommendation = recommendation
            },
            BoundingBoxes = boxes.Select(b => new { b.X, b.Y, b.Width, b.Height }),
            Diagnosis = diagnosis == null ? null : new
            {
                diagnosis.Id,
                diagnosis.DiagnosisText,
                diagnosis.FinalResult,
                diagnosis.SeverityLevel,
                diagnosis.CreatedAt,
                DoctorName = diagnosis.Doctor?.User?.FullName
            },
            Suggestions = suggestions.Select(s => new { s.Id, s.SuggestedText, s.IsUsedByDoctor })
        });
    }

    // Gọi AI service bất đồng bộ
    private async Task CallAiServiceAsync(int imageId, int inferenceId)
    {
        try
        {
            var payload = new { imageId, inferenceId };
            var content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json"
            );

            var baseUrl  = _configuration["AIService:BaseUrl"] ?? "http://localhost:8000";
            var response = await _httpClient.PostAsync($"{baseUrl}/ai/analyze", content);

            if (response.IsSuccessStatusCode)
                Console.WriteLine($"--- Đã kích hoạt AI thành công cho Image: {imageId} ---");
            else
            {
                var error = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"--- AI Service lỗi ({response.StatusCode}): {error} ---");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"--- Lỗi kết nối AI Service: {ex.Message} ---");
        }
    }

    // Tự động phân công ảnh cho bác sĩ phù hợp nhất
    private async Task AutoAssignImageAsync(MedicalImage image)
    {
        try
        {
            var specialtyKeywords = new[] { "phổi", "hô hấp", "x-quang", "chẩn đoán hình ảnh" };

            var doctors = await _context.Doctors
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

            if (doctors.Count == 0) return;

            var bestDoctor = doctors
                .OrderByDescending(d => (d.Specialization != null &&
                    specialtyKeywords.Any(k => d.Specialization.ToLower().Contains(k))) ? 2 : 0)
                .ThenBy(d => d.AssignedCount)
                .ThenBy(d => d.LastAssignedAt ?? DateTime.MinValue)
                .First();

            _context.ImageAssignments.Add(new ImageAssignment
            {
                ImageId    = image.Id,
                DoctorId   = bestDoctor.UserId,
                AssignedBy = image.PatientId,
                AssignedAt = DateTime.Now,
                Status     = "pending"
            });

            image.Status = "assigned";

            _context.Notifications.Add(new Notification
            {
                UserId    = bestDoctor.UserId,
                Title     = "Ca mới được tự động phân công",
                Content   = $"Bạn được tự động phân công xem xét ảnh #{image.Id}",
                IsRead    = false,
                CreatedAt = DateTime.Now
            });

            await _context.SaveChangesAsync();
        }
        catch
        {
            // Nếu auto-assign lỗi → bỏ qua, admin phân công thủ công sau
        }
    }
}