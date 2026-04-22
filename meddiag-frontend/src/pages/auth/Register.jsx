import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../api/auth';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    address: '',
  });

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="min-h-screen flex">

      {/* TRÁI — ảnh */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&q=80"
          alt="Hospital"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900/70 to-teal-600/40" />
        <div className="absolute inset-0 flex flex-col justify-center px-12 text-white">
          <div className="flex items-center gap-3 mb-8">
           
            <span className="text-2xl font-bold">MedDiag AI</span>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Chẩn đoán<br />thông minh hơn<br />với AI
          </h2>
          <p className="text-teal-100 text-lg leading-relaxed">
            Hệ thống hỗ trợ chẩn đoán X-quang phổi,<br />
            kết nối bệnh nhân và bác sĩ chuyên khoa.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {[
              'Phân tích X-quang bằng AI trong 30 giây',
              'Kết nối trực tiếp với bác sĩ chuyên khoa',
              'Bảo mật thông tin bệnh nhân tuyệt đối',
            ].map(t => (
              <div key={t} className="flex items-center gap-2 text-teal-100">
                <div className="w-5 h-5 rounded-full bg-teal-400 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PHẢI — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-8 py-8 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <span className="text-3xl">🏥</span>
            <span className="text-xl font-bold text-gray-800">MedDiag AI</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-1">Tạo tài khoản</h1>
          <p className="text-gray-500 mb-6 text-sm">Điền đầy đủ thông tin để đăng ký</p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Họ và tên */}
            <div>
              <label className={labelClass}>Họ và tên <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Nguyễn Văn A"
                value={form.fullName} onChange={set('fullName')} required
                className={inputClass} />
            </div>

            {/* Email */}
            <div>
              <label className={labelClass}>Email <span className="text-red-500">*</span></label>
              <input type="email" placeholder="email@gmail.com"
                value={form.email} onChange={set('email')} required
                className={inputClass} />
            </div>

            {/* Username + Ngày sinh */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Tên đăng nhập <span className="text-red-500">*</span></label>
                <input type="text" placeholder="username"
                  value={form.username} onChange={set('username')} required
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Ngày sinh <span className="text-red-500">*</span></label>
                <input type="date"
                  value={form.dateOfBirth} onChange={set('dateOfBirth')} required
                  max={new Date().toISOString().split('T')[0]}
                  className={inputClass} />
              </div>
            </div>

            {/* Giới tính + SĐT */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Giới tính <span className="text-red-500">*</span></label>
                <select value={form.gender} onChange={set('gender')} required
                  className={inputClass}>
                  <option value="">-- Chọn --</option>
                  <option value="Male">Nam</option>
                  <option value="Female">Nữ</option>
                  <option value="Other">Khác</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Số điện thoại <span className="text-red-500">*</span></label>
                <input type="tel" placeholder="0912345678"
                  value={form.phone} onChange={set('phone')} required
                  pattern="^(0|\+84)\d{9,10}$"
                  title="Số điện thoại không hợp lệ"
                  className={inputClass} />
              </div>
            </div>

            {/* Địa chỉ */}
            <div>
              <label className={labelClass}>Địa chỉ <span className="text-red-500">*</span></label>
              <input type="text" placeholder="123 Lê Lợi, Q.1, TP.HCM"
                value={form.address} onChange={set('address')} required
                className={inputClass} />
            </div>

            {/* Mật khẩu */}
            <div>
              <label className={labelClass}>Mật khẩu <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="nhập password"
                  value={form.password} onChange={set('password')} required
                  className={inputClass + ' pr-11'}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2 mt-1">
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : 'Tạo tài khoản'}
            </button>

          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-teal-600 font-semibold hover:underline">Đăng nhập</Link>
          </p>

        </div>
      </div>

    </div>
  );
}