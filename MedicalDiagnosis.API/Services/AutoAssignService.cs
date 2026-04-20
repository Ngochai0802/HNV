namespace MedicalDiagnosis.API.Services;

/// <summary>
/// Service quản lý trạng thái tự động phân công ảnh.
/// Khi BẬT: mỗi ảnh mới upload sẽ tự động phân công cho bác sĩ phù hợp nhất.
/// Khi TẮT: admin phải phân công thủ công.
/// </summary>
public class AutoAssignService
{
    private bool _isEnabled = false;
    private readonly object _lock = new();

    public bool IsEnabled
    {
        get { lock (_lock) return _isEnabled; }
    }

    public bool Toggle()
    {
        lock (_lock)
        {
            _isEnabled = !_isEnabled;
            return _isEnabled;
        }
    }

    public void SetEnabled(bool enabled)
    {
        lock (_lock) _isEnabled = enabled;
    }
}
