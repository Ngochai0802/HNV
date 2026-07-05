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

        if (file.Length > 20 * 1024 * 1024)
            return BadRequest(new { message = "Dung lượng vượt quá 20MB" });

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

        // Gọi AI service đồng bộ - chờ kết quả để kiểm tra ảnh
        var aiResult = await CallAiServiceAsync(image.Id, inference.Id);
        if (!aiResult)
        {
            // Xóa file vật lý
            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
            }
            
            // Xóa record trong DB
            _context.AiInferences.Remove(inference);
            _context.MedicalImages.Remove(image);
            await _context.SaveChangesAsync();

            return BadRequest(new { message = "Ảnh không phải X-quang phổi, vui lòng upload lại" });
        }

        // Tự động phân công nếu chế độ đang BẬT
        if (_autoAssign.IsEnabled)
        {
            await AutoAssignImageAsync(image);
        }
        else
        {
            // Gửi thông báo cho tất cả Admin để phân công thủ công
            var adminIds = await _context.Users
                .Where(u => u.Role!.RoleName == "admin" && u.IsActive && !u.IsDeleted)
                .Select(u => u.Id)
                .ToListAsync();
            
            var patientName = await _context.Users
                .Where(u => u.Id == userId)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync() ?? "Bệnh nhân";

            foreach (var adminId in adminIds)
            {
                _context.Notifications.Add(new Notification
                {
                    UserId     = adminId,
                    Title      = "Có ảnh mới cần phân công",
                    Content    = $"Bệnh nhân {patientName} vừa tải lên ảnh #{image.Id}. Hãy phân công cho bác sĩ.",
                    IsRead     = false,
                    RelatedUrl = "/admin/images",
                    CreatedAt  = DateTime.Now
                });
            }
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Upload thành công", imageId = image.Id });
    }

    // GET /api/images
    [HttpGet]
    [Authorize(Roles = "patient")]
    public async Task<IActionResult> GetMyImages()
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

        // Query 1: Lấy ảnh + inference mới nhất + model + result + boxes trong 1 lần
        var image = await _context.MedicalImages
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted);

        if (image == null) return NotFound();

        if (role == "patient" && image.PatientId != userId)
            return Forbid();

        // Query 2: Lấy inference mới nhất + result + bounding boxes (1 round-trip)
        var inferenceData = await (
            from i in _context.AiInferences
            where i.ImageId == id
            orderby i.CreatedAt descending
            join m in _context.AiModels on i.ModelId equals m.Id into models
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
                ProcessedImageUrl   = result != null ? result.ProcessedImageUrl : null,
                HeatmapBase64       = result != null ? result.HeatmapBase64 : null
            }
        ).AsNoTracking().FirstOrDefaultAsync();

        // Query 3: Bounding boxes (chỉ khi có result)
        List<AiBoundingBox> boxes = inferenceData?.ResultId != null
            ? await _context.AiBoundingBoxes
                .AsNoTracking()
                .Where(b => b.ResultId == inferenceData.ResultId)
                .ToListAsync()
            : new();

        // Query 4 + 5: Diagnosis và Suggestions tuần tự (DbContext không thread-safe)
        var diagnosis = await _context.Diagnoses
            .AsNoTracking()
            .Where(d => d.ImageId == id)
            .Select(d => new
            {
                d.Id,
                d.DoctorId,
                d.DiagnosisText,
                d.FinalResult,
                d.SeverityLevel,
                d.CreatedAt,
                DoctorName = d.Doctor != null && d.Doctor.User != null ? d.Doctor.User.FullName : null
            })
            .FirstOrDefaultAsync();

        var suggestions = await _context.AiSuggestions
            .AsNoTracking()
            .Where(s => s.ImageId == id)
            .Select(s => new { s.Id, s.SuggestedText, s.IsUsedByDoctor })
            .ToListAsync();

        // Tính severity từ dữ liệu đã có (không cần thêm DB call)
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
            image.Id,
            image.FileName,
            image.ImageUrl,
            image.Status,
            image.UploadDate,
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
                HeatmapBase64     = inferenceData.HeatmapBase64,
                Severity          = severity,
                SeverityText      = severityText,
                Recommendation    = recommendation
            },
            BoundingBoxes = boxes.Select(b => new { b.X, b.Y, b.Width, b.Height }),
            Diagnosis     = diagnosis,
            Suggestions   = suggestions
        });
    }

    private async Task<bool> CallAiServiceAsync(int imageId, int inferenceId)
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
            var body     = await response.Content.ReadAsStringAsync();

            // Parse response từ AI để kiểm tra kết quả
            var json   = JsonSerializer.Deserialize<JsonElement>(body);
            var status = json.GetProperty("status").GetString();

            if (status == "failed")
            {
                Console.WriteLine($"--- AI reject ảnh {imageId}: {body} ---");
                return false;
            }

            Console.WriteLine($"--- AI thành công cho Image: {imageId} ---");
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"--- Lỗi kết nối AI Service: {ex.Message} ---");
            return false;
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
                UserId     = bestDoctor.UserId,
                Title      = "Ca mới được tự động phân công",
                Content    = $"Bạn được tự động phân công xem xét ảnh #{image.Id}",
                IsRead     = false,
                RelatedUrl = $"/doctor/cases/{image.Id}",
                CreatedAt  = DateTime.Now
            });

            await _context.SaveChangesAsync();
        }
        catch
        {
            // Nếu auto-assign lỗi → bỏ qua, admin phân công thủ công sau
        }
    }
}