namespace MedicalDiagnosis.Core.DTOs;
 
public class RegisterRequest
{
    public string Username { get; set; } = null!;
    public string Password { get; set; } = null!;
    public string Email    { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public DateTime? DateOfBirth { get; set; }  
    public string? Gender { get; set; }
public string? Phone { get; set; }
public string? Address { get; set; }
    // Không cho chọn role — mặc định = patient
}
 
public class LoginRequest
{
    public string Username { get; set; } = null!;
    public string Password { get; set; } = null!;
}
 
public class AuthResponse
{
    public string AccessToken  { get; set; } = null!;
    public string RefreshToken { get; set; } = null!;
    public UserInfo User       { get; set; } = null!;
}
 
public class UserInfo
{
    public int    Id       { get; set; }
    public string Username { get; set; } = null!;
    public string Email    { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string Role     { get; set; } = null!;
}
 
public class RefreshRequest
{
    public string RefreshToken { get; set; } = null!;
}
public class AiResultDto {
    public bool HasFinding { get; set; }
    public string Summary { get; set; }
    public List<FindingDto> AllFindings { get; set; }
    
    // Thêm trường này để chứa link ảnh từ server (ví dụ: /uploads/processed/abc.jpg)
    public string? ProcessedImageUrl { get; set; } 
    
    // Giữ lại cái này nếu bạn muốn hiển thị ảnh heatmap dạng chuỗi byte
    public string? HeatmapBase64 { get; set; }
    public string Severity { get; set; }      // "safe", "warning", "danger"
    public string SeverityText { get; set; }  // "An toàn", "Cần khám ngay", "Nguy hiểm"
    public string Recommendation { get; set; } // "Bạn nên nghỉ ngơi...", "Cần gặp bác sĩ..."
}

public class FindingDto {
    public string Label { get; set; }
    public string LabelVi { get; set; }
    public double Probability { get; set; }
    public bool Detected { get; set; }
    public string Severity { get; set; }   // normal | mild | moderate | severe
}