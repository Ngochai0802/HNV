import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../api/auth';
import toast from 'react-hot-toast';
import { Eye, EyeOff, HeartPulse } from 'lucide-react';
import registerBg from '../../assets/register-bg.png';

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

  const inputClass = "w-full border-b-2 border-slate-200 py-2 focus:outline-none focus:border-blue-500 transition-colors bg-transparent text-slate-800 font-medium placeholder:text-slate-400 placeholder:font-normal";
  const labelClass = "block text-xs font-bold text-slate-500 mb-2";

  return (
    <div className="min-h-screen flex w-full font-sans">

      {/* TRÁI — ảnh */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#2d1162]">
        <img
          src={registerBg}
          alt="AI Medical Healthcare"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        {/* Lớp phủ đậm hơn một chút để nổi chữ */}
        <div className="absolute inset-0 bg-black/30 z-10" /> 
        
        <div className="absolute inset-0 z-20 flex flex-col justify-center px-12 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-white text-blue-600 rounded-xl shadow-lg">
              <HeartPulse size={28} />
            </div>
            <span className="text-2xl font-bold">MedDiag AI</span>
          </div>
          
          {/* Thêm drop-shadow ở đây */}
          <h2 className="text-4xl font-bold leading-tight mb-4 drop-shadow-lg">
            Chẩn đoán<br />thông minh hơn<br />với AI
          </h2>
          
          <p className="text-blue-100 text-lg leading-relaxed drop-shadow-md">
            Hệ thống hỗ trợ chẩn đoán X-quang phổi,<br />
            kết nối bệnh nhân và bác sĩ chuyên khoa.
          </p>
          
          <div className="mt-8 flex flex-col gap-3">
            {[
              'Phân tích X-quang bằng AI trong 30 giây',
              'Kết nối trực tiếp với bác sĩ chuyên khoa',
              'Bảo mật thông tin bệnh nhân tuyệt đối',
            ].map(t => (
              <div key={t} className="flex items-center gap-2 text-blue-100 drop-shadow-sm">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-medium">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PHẢI — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-8 py-8 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-6 lg:hidden">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 rounded-xl text-white shadow-lg">
              <HeartPulse size={24} />
            </div>
            <span className="text-xl font-bold text-gray-800">MedDiag AI</span>
          </div>

          <h1 className="text-3xl font-extrabold text-blue-600 tracking-tight mb-1">Tạo tài khoản</h1>
          <p className="text-slate-500 text-sm font-medium tracking-wide mb-8">Điền đầy đủ thông tin để đăng ký</p>

          <form onSubmit={handleSubmit} className="space-y-6">

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
            <div className="grid grid-cols-2 gap-4">
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
                  className={inputClass + ' text-slate-500'} />
              </div>
            </div>

            {/* Giới tính + SĐT */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Giới tính <span className="text-red-500">*</span></label>
                <select value={form.gender} onChange={set('gender')} required
                  className={inputClass + ' text-slate-500 bg-transparent'}>
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
                  className={inputClass + ' pr-11 tracking-widest'}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full bg-[#0d8bf0] hover:bg-blue-600 text-white py-3.5 rounded-lg font-bold transition-all shadow-md mt-4 flex items-center justify-center gap-2 disabled:opacity-70">
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : 'TẠO TÀI KHOẢN'}
            </button>

          </form>

          <p className="text-center text-sm font-medium text-slate-500 mt-8">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-blue-600 font-bold hover:underline ml-1">Đăng nhập</Link>
          </p>

        </div>
      </div>

    </div>
  );
}