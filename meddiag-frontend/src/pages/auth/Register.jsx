import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../api/auth';
import toast from 'react-hot-toast';
import { Eye, EyeOff, HeartPulse } from 'lucide-react';
import registerBg from '../../assets/register-bg.png';

// ─── Validation rules ─────────────────────────────────────────────────────────
function validateForm(form) {
  const errors = {};

  // 1. Họ và tên: 2–50 ký tự, không có số hoặc ký tự đặc biệt
  if (!form.fullName.trim()) {
    errors.fullName = 'Họ và tên không được để trống.';
  } else if (form.fullName.trim().length < 2 || form.fullName.trim().length > 50) {
    errors.fullName = 'Họ và tên phải từ 2 đến 50 ký tự.';
  } else if (/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(form.fullName)) {
    errors.fullName = 'Họ và tên không được chứa số hoặc ký tự đặc biệt.';
  }

  // 2. Email: đúng định dạng
  if (!form.email.trim()) {
    errors.email = 'Email không được để trống.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Email không đúng định dạng (vd: abc@gmail.com).';
  }

  // 3. Tên đăng nhập: 4–20 ký tự, chỉ chữ + số
  if (!form.username.trim()) {
    errors.username = 'Tên đăng nhập không được để trống.';
  } else if (form.username.length < 4 || form.username.length > 20) {
    errors.username = 'Tên đăng nhập phải từ 4 đến 20 ký tự.';
  } else if (!/^[a-zA-Z0-9]+$/.test(form.username)) {
    errors.username = 'Chỉ được gồm chữ cái và số, không dấu, không ký tự đặc biệt.';
  }

  // 4. Ngày sinh: không phải hôm nay hoặc tương lai, tuổi < 120
  if (!form.dateOfBirth) {
    errors.dateOfBirth = 'Ngày sinh không được để trống.';
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dob = new Date(form.dateOfBirth);
    if (dob >= today) {
      errors.dateOfBirth = 'Ngày sinh không được là hôm nay hoặc tương lai.';
    } else {
      const ageYears = (today - dob) / (1000 * 60 * 60 * 24 * 365.25);
      if (ageYears >= 120) {
        errors.dateOfBirth = 'Tuổi không hợp lệ (phải nhỏ hơn 120).';
      }
    }
  }

  // 5. Giới tính
  if (!form.gender) {
    errors.gender = 'Vui lòng chọn giới tính.';
  }

  // 6. Số điện thoại: 10 chữ số, bắt đầu bằng 0
  if (!form.phone.trim()) {
    errors.phone = 'Số điện thoại không được để trống.';
  } else if (!/^0\d{9}$/.test(form.phone)) {
    errors.phone = 'Phải gồm 10 chữ số, bắt đầu bằng 0 (vd: 0912345678).';
  }

  // 7. Địa chỉ: 5–100 ký tự
  if (!form.address.trim()) {
    errors.address = 'Địa chỉ không được để trống.';
  } else if (form.address.trim().length < 5) {
    errors.address = 'Địa chỉ phải có ít nhất 5 ký tự.';
  } else if (form.address.trim().length > 100) {
    errors.address = 'Địa chỉ không được vượt quá 100 ký tự.';
  }

  // 8. Mật khẩu: ≥8 ký tự, có ít nhất 1 chữ và 1 số
  if (!form.password) {
    errors.password = 'Mật khẩu không được để trống.';
  } else if (form.password.length < 8) {
    errors.password = 'Mật khẩu phải có ít nhất 8 ký tự.';
  } else if (!/[A-Za-z]/.test(form.password)) {
    errors.password = 'Mật khẩu phải chứa ít nhất 1 chữ cái.';
  } else if (!/\d/.test(form.password)) {
    errors.password = 'Mật khẩu phải chứa ít nhất 1 chữ số.';
  }

  return errors;
}

// ─── Error message component ──────────────────────────────────────────────────
function ErrMsg({ msg }) {
  if (!msg) return null;
  return (
    <p style={{ marginTop: '4px', fontSize: '11.5px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
      <span>⚠</span> {msg}
    </p>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});

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

  const errors = validateForm(form);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const touch = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  // Show error only after the field is blurred OR the form is submitted
  const showErr = (field) => ((touched[field] || submitted) ? errors[field] : undefined);

  const inputCls = (field) => {
    const hasErr = showErr(field);
    return (
      'w-full border-b-2 py-2 focus:outline-none transition-colors bg-transparent font-medium ' +
      'placeholder:text-slate-400 placeholder:font-normal ' +
      (hasErr
        ? 'border-red-400 text-red-700 focus:border-red-500'
        : 'border-slate-200 text-slate-800 focus:border-blue-500')
    );
  };

  const labelClass = 'block text-xs font-bold text-slate-500 mb-2';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);

    if (Object.keys(errors).length > 0) {
      toast.error('Vui lòng kiểm tra lại thông tin đã nhập.');
      return;
    }

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

  return (
    <div className="min-h-screen flex w-full font-sans">

      {/* ── TRÁI — ảnh minh hoạ ─────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#2d1162]">
        <img
          src={registerBg}
          alt="AI Medical Healthcare"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        <div className="absolute inset-0 bg-black/30 z-10" />

        <div className="absolute inset-0 z-20 flex flex-col justify-center px-12 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-white text-blue-600 rounded-xl shadow-lg">
              <HeartPulse size={28} />
            </div>
            <span className="text-2xl font-bold">MedDiag AI</span>
          </div>

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
            ].map((t) => (
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

      {/* ── PHẢI — form ─────────────────────────────────────────── */}
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

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Họ và tên */}
            <div>
              <label className={labelClass}>
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Nguyễn Văn A"
                value={form.fullName}
                onChange={set('fullName')}
                onBlur={touch('fullName')}
                className={inputCls('fullName')}
              />
              <ErrMsg msg={showErr('fullName')} />
            </div>

            {/* Email */}
            <div>
              <label className={labelClass}>
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                placeholder="email@gmail.com"
                value={form.email}
                onChange={set('email')}
                onBlur={touch('email')}
                className={inputCls('email')}
              />
              <ErrMsg msg={showErr('email')} />
            </div>

            {/* Username + Ngày sinh */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Tên đăng nhập <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="hung123"
                  value={form.username}
                  onChange={set('username')}
                  onBlur={touch('username')}
                  className={inputCls('username')}
                />
                <ErrMsg msg={showErr('username')} />
              </div>
              <div>
                <label className={labelClass}>
                  Ngày sinh <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={set('dateOfBirth')}
                  onBlur={touch('dateOfBirth')}
                  max={new Date().toISOString().split('T')[0]}
                  className={inputCls('dateOfBirth') + ' text-slate-500'}
                />
                <ErrMsg msg={showErr('dateOfBirth')} />
              </div>
            </div>

            {/* Giới tính + SĐT */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Giới tính <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.gender}
                  onChange={set('gender')}
                  onBlur={touch('gender')}
                  className={inputCls('gender') + ' bg-transparent'}
                >
                  <option value="">-- Chọn --</option>
                  <option value="Male">Nam</option>
                  <option value="Female">Nữ</option>
                  <option value="Other">Khác</option>
                </select>
                <ErrMsg msg={showErr('gender')} />
              </div>
              <div>
                <label className={labelClass}>
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="0912345678"
                  value={form.phone}
                  onChange={set('phone')}
                  onBlur={touch('phone')}
                  maxLength={10}
                  className={inputCls('phone')}
                />
                <ErrMsg msg={showErr('phone')} />
              </div>
            </div>

            {/* Địa chỉ */}
            <div>
              <label className={labelClass}>
                Địa chỉ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="123 Lê Lợi, Q.1, TP.HCM"
                value={form.address}
                onChange={set('address')}
                onBlur={touch('address')}
                className={inputCls('address')}
              />
              <ErrMsg msg={showErr('address')} />
            </div>

            {/* Mật khẩu */}
            <div>
              <label className={labelClass}>
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Tối thiểu 8 ký tự, có chữ và số"
                  value={form.password}
                  onChange={set('password')}
                  onBlur={touch('password')}
                  className={inputCls('password') + ' pr-11 tracking-widest'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <ErrMsg msg={showErr('password')} />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0d8bf0] hover:bg-blue-600 text-white py-3.5 rounded-lg font-bold transition-all shadow-md mt-4 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'TẠO TÀI KHOẢN'
              )}
            </button>

          </form>

          <p className="text-center text-sm font-medium text-slate-500 mt-8">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-blue-600 font-bold hover:underline ml-1">
              Đăng nhập
            </Link>
          </p>

        </div>
      </div>

    </div>
  );
}