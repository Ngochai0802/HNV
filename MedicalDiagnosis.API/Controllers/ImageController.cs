using MedicalDiagnosis.Core.DTOs;
using MedicalDiagnosis.Core.Entities;
using MedicalDiagnosis.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;
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
    private readonly IConfiguration _configuration;
    public ImageController(AppDbContext context, IWebHostEnvironment env, IHttpClientFactory httpClientFactory,IConfiguration configuration)
    {
        _context    = context;
        _env        = env;
        _httpClient = httpClientFactory.CreateClient("AI");
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

        // Lưu file vào wwwroot/uploads/{userId}/
        var webRoot     = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var uploadFolder = Path.Combine(webRoot, "uploads", userId.ToString());
        Directory.CreateDirectory(uploadFolder);

        var fileName  = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var filePath  = Path.Combine(uploadFolder, fileName);
        var imageUrl  = $"/uploads/{userId}/{fileName}";

        using (var stream = new FileStream(filePath, FileMode.Create))
            await file.CopyToAsync(stream);

        // Lấy model AI đang active
        var aiModel = await _context.AiModels.FirstOrDefaultAsync(m => m.IsActive);
        if (aiModel == null)
            return StatusCode(500, new { message = "Không tìm thấy AI model" });

        // Tạo MedicalImage
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

        // Tạo AiInference
        var inference = new AiInference
        {
            ImageId   = image.Id,
            ModelId   = aiModel.Id,
            Status    = "pending",
            CreatedAt = DateTime.Now
        };
        _context.AiInferences.Add(inference);
        await _context.SaveChangesAsync();

        // Gọi AI service (background — không chờ)
        _ = CallAiServiceAsync(image.Id, inference.Id);

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
    [AllowAnonymous]
    [HttpGet("{id}")]
    [Authorize(Roles = "patient,doctor,admin")]
    public async Task<IActionResult> GetImageDetail(int id)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var role = User.FindFirst(ClaimTypes.Role)!.Value;

        var image = await _context.MedicalImages
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted);

        if (image == null) return NotFound();

        if (role == "patient" && image.PatientId != userId)
            return Forbid();

        var inference = await _context.AiInferences
            .Include(i => i.Model)
            .Where(i => i.ImageId == id)
            .OrderByDescending(i => i.CreatedAt)
            .FirstOrDefaultAsync();

        AiResult? result = null;
        List<AiBoundingBox> boxes = new();

        // Khởi tạo giá trị mặc định
        string severity = "safe";
        string severityText = "Chưa có kết quả";
        string recommendation = "Đang chờ hệ thống phân tích hình ảnh.";

        if (inference != null)
        {
            result = await _context.AiResults
                .FirstOrDefaultAsync(r => r.InferenceId == inference.Id);

            if (result != null)
            {
                boxes = await _context.AiBoundingBoxes
                    .Where(b => b.ResultId == result.Id)
                    .ToListAsync();

                // LOGIC PHÂN LOẠI (Chỉ chạy khi có result)
                severityText = "An toàn";
                recommendation = "Kết quả sơ bộ cho thấy chưa có dấu hiệu bất thường rõ rệt.";

                if (result.ConfidenceScore > 80 && result.PredictionLabel != "Bình thường")
                {
                    severity = "danger";
                    severityText = "Nguy hiểm";
                    recommendation = "Dấu hiệu bệnh lý rõ rệt. Bạn cần nhập viện hoặc liên hệ cấp cứu ngay.";
                }
                else if (result.ConfidenceScore > 40 && result.PredictionLabel != "Bình thường")
                {
                    severity = "warning";
                    severityText = "Cần khám ngay";
                    recommendation = "Phát hiện dấu hiệu nghi vấn. Hãy đặt lịch hẹn với bác sĩ chuyên khoa sớm nhất.";
                }
            }
        }

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
                // PHẢI TRẢ THÊM 3 TRƯỜNG NÀY VỀ FRONTEND
                Severity = severity,
                SeverityText = severityText,
                Recommendation = recommendation
            },
            BoundingBoxes = boxes.Select(b => new { b.X, b.Y, b.Width, b.Height })
        });
    }

    // Gọi AI service bất đồng bộ
    private async Task CallAiServiceAsync(int imageId, int inferenceId)
    {
        try 
        {
            // 1. Lấy thông tin ảnh từ DB (Optional: chỉ lấy nếu cần log)
            // var image = await _context.MedicalImages.FindAsync(imageId);
            
            // 2. Gửi request sang AI Service
            // LƯU Ý: Tên ImageId và InferenceId phải khớp chính xác với AnalyzeRequest bên Python
            var payload = new {
                imageId = imageId,      // Đổi từ image_id -> imageId
                inferenceId = inferenceId // Đổi từ inference_id -> inferenceId
            };

            var content = new StringContent(
                JsonSerializer.Serialize(payload), 
                Encoding.UTF8, 
                "application/json" // Đây là tham số thứ 3
            );

            // 3. Lấy BaseUrl từ appsettings.json và gọi đúng endpoint /ai/analyze
            var baseUrl = _configuration["AIService:BaseUrl"] ?? "http://localhost:8000";
            var response = await _httpClient.PostAsync($"{baseUrl}/ai/analyze", content);

            if (response.IsSuccessStatusCode)
            {
                Console.WriteLine($"--- Đã kích hoạt AI thành công cho Image: {imageId} ---");
            }
            else
            {
                var error = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"--- AI Service trả về lỗi ({response.StatusCode}): {error} ---");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"--- Lỗi kết nối AI Service: {ex.Message} ---");
        }
    }
}