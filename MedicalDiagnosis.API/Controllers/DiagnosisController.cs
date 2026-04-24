using Microsoft.AspNetCore.Mvc;
using MedicalDiagnosis.API.Services;
using MedicalDiagnosis.Core.DTOs;
using MedicalDiagnosis.Core.Entities;
using MedicalDiagnosis.Infrastructure.Data;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace MedicalDiagnosis.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DiagnosisController : ControllerBase
{
    private readonly IAIService _aiService;
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public DiagnosisController(IAIService aiService, AppDbContext db, IWebHostEnvironment env)
    {
        _aiService = aiService;
        _db = db;
        _env = env;
    }

    [HttpPost("analyze")]
    public async Task<IActionResult> Analyze(
        [FromForm] IFormFile xrayImage,
        [FromForm] int patientId,
        [FromForm] int doctorId,
        [FromForm] int uploadedBy)
    {
        // --- 1. Validate ---
        if (xrayImage == null || xrayImage.Length == 0)
            return BadRequest("Vui lòng upload ảnh X-quang.");

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp" };
        if (!allowedTypes.Contains(xrayImage.ContentType))
            return BadRequest("Chỉ chấp nhận JPEG hoặc PNG.");

        // --- 2. Lưu file gốc vào wwwroot/uploads ---
        var ext      = Path.GetExtension(xrayImage.FileName);
        var fileName = $"{Guid.NewGuid()}{ext}";
        var folder   = Path.Combine(_env.WebRootPath, "uploads");
        Directory.CreateDirectory(folder);

        var fullPath = Path.Combine(folder, fileName);
        using (var fs = new FileStream(fullPath, FileMode.Create))
            await xrayImage.CopyToAsync(fs);

        var image_url = $"/uploads/{fileName}";

        // --- 3. Tạo MedicalImage record ---
        var medImage = new MedicalImage
        {
            PatientId  = patientId,
            UploadedBy = uploadedBy,
            ImageUrl   = image_url,
            FileName   = xrayImage.FileName,
            FileSize   = xrayImage.Length,
            UploadDate = DateTime.Now,
            Status     = "processing",
            IsDeleted  = false
        };
        _db.MedicalImages.Add(medImage);
        await _db.SaveChangesAsync();

        // --- 4. Gọi AI Service ---
        AiResultDto aiResult;
        try
        {
            var fileBytes = await System.IO.File.ReadAllBytesAsync(fullPath);
            aiResult = await _aiService.AnalyzeXRayAsync(fileBytes, xrayImage.FileName);
        }
        catch (Exception ex)
        {
            medImage.Status = "ai_error";
            await _db.SaveChangesAsync();
            return StatusCode(503, new { message = "AI Service không phản hồi.", error = ex.Message });
        }

        // --- 5. Xử lý lưu ảnh Heatmap từ AI ---
        string heatmapUrl = null;
        if (!string.IsNullOrEmpty(aiResult.HeatmapBase64))
        {
            try 
            {
                var heatmapFileName = $"heatmap_{Guid.NewGuid()}.jpg";
                var heatmapSavePath = Path.Combine(folder, heatmapFileName);
                
                // Loại bỏ header của base64 nếu có (e.g., data:image/jpeg;base64,)
                var base64String = aiResult.HeatmapBase64;
                if (base64String.Contains(","))
                {
                    base64String = base64String.Split(',')[1];
                }

                byte[] imageBytes = Convert.FromBase64String(base64String);
                await System.IO.File.WriteAllBytesAsync(heatmapSavePath, imageBytes);
                
                heatmapUrl = $"/uploads/{heatmapFileName}";
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi lưu heatmap: {ex.Message}");
                // Nếu lỗi lưu heatmap thì dùng tạm ảnh gốc để không bị crash
                heatmapUrl = image_url;
            }
        }

        // --- 6. Lưu kết quả vào bảng Diagnoses ---
        var topFinding = aiResult.AllFindings?.OrderByDescending(f => f.Probability).FirstOrDefault();

        var diagnosis = new Diagnosis
        {
            ImageId         = medImage.Id,
            DoctorId        = doctorId,
            DiagnosisText   = aiResult.Summary, 
            FinalResult     = topFinding?.LabelVi ?? "Bình thường",
            SeverityLevel   = topFinding?.Severity ?? "normal",
            HasAbnormality  = aiResult.HasFinding,
            AIFindings      = JsonSerializer.Serialize(aiResult.AllFindings),
            
            // QUAN TRỌNG: Gán heatmapUrl thực tế đã lưu
            HeatmapPath     = heatmapUrl ?? image_url, 
            
            // Ép kiểu double/float tùy theo Entity của bạn
            Confidence      = (float)(topFinding?.Probability ?? 0),
            CreatedAt       = DateTime.Now
        };
        
        _db.Diagnoses.Add(diagnosis);

        // Cập nhật status ảnh
        medImage.Status = "analyzed";
        await _db.SaveChangesAsync();

        // --- 7. Trả kết quả về Frontend ---
        return Ok(new
        {
            diagnosisId     = diagnosis.Id,
            imageId         = medImage.Id,
            image_url        = image_url,
            heatmap_url      = diagnosis.HeatmapPath, // Trả về link ảnh heatmap để web hiển thị
            hasFinding      = aiResult.HasFinding,
            summary         = aiResult.Summary,
            finalResult     = diagnosis.FinalResult,
            severityLevel   = diagnosis.SeverityLevel,
            confidence      = diagnosis.Confidence,
            topFinding      = topFinding, 
            allFindings     = aiResult.AllFindings,
            disclaimer      = "Kết quả chỉ mang tính tham khảo. Vui lòng hỏi bác sĩ."
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var d = await _db.Diagnoses
            .Include(x => x.Image)
            .Include(x => x.Doctor)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (d == null) return NotFound();
        return Ok(d);
    }

    [HttpGet("image/{imageId}")]
    public async Task<IActionResult> GetByImage(int imageId)
    {
        var d = await _db.Diagnoses
            .Include(x => x.Image)
            .Include(x => x.Doctor)
            .Where(x => x.ImageId == imageId)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync();

        if (d == null) return NotFound("Chưa có chẩn đoán cho ảnh này.");
        return Ok(d);
    }

    [HttpGet("patient/{patientId}")]
    public async Task<IActionResult> GetByPatient(int patientId)
    {
        var list = await _db.Diagnoses
            .Include(x => x.Image)
            .Include(x => x.Doctor)
            .Where(x => x.Image!.PatientId == patientId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        return Ok(list);
    }
}