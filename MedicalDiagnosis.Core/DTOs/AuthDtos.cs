namespace MedicalDiagnosis.Core.DTOs;
 
public class RegisterRequest
{
    public string Username { get; set; } = null!;
    public string Password { get; set; } = null!;
    public string Email    { get; set; } = null!;
    public string FullName { get; set; } = null!;
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
