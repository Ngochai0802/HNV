using MedicalDiagnosis.Core.DTOs;
using System.Net.Http.Json;

namespace MedicalDiagnosis.API.Services
{
    // Chỉ giữ một định nghĩa duy nhất để tránh lỗi CS0101
    public interface IAIService
    {
        Task<AiResultDto> AnalyzeXRayAsync(byte[] imageBytes, string fileName);
    }

    public class AiService : IAIService
    {
        private readonly HttpClient _http;

        public AiService(HttpClient http)
        {
            _http = http;
        }

        public async Task<AiResultDto> AnalyzeXRayAsync(byte[] imageBytes, string fileName)
        {
            using var content = new MultipartFormDataContent();
            using var byteStream = new ByteArrayContent(imageBytes);
            
            byteStream.Headers.ContentType =
                new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");

            content.Add(byteStream, "file", fileName);

            // Giữ nguyên logic gọi API của bạn
            var response = await _http.PostAsync("/diagnose", content);
            response.EnsureSuccessStatusCode();

            // Lưu ý: Kiểm tra file DTO của bạn là AiResultDto hay AIResultDto để khớp tên ở đây
            return await response.Content.ReadFromJsonAsync<AiResultDto>()
                   ?? throw new Exception("AI trả về dữ liệu rỗng.");
        }
    }
}