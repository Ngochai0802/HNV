import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { login } from "../../api/auth";
import useAuthStore from "../../store/useAuthStore";
import toast from "react-hot-toast";
import { HeartPulse, User, Lock, ArrowRight } from "lucide-react";
import loginBg from "../../assets/login-bg.png";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { login: setAuth } = useAuthStore();

  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || "/patient";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(form);
      const { user, accessToken, refreshToken } = res.data;

      setAuth(user, accessToken, refreshToken);

      toast.success(`Chào, ${user.fullName}!`);

      if (user.role === "admin") {
        navigate("/admin");
      } else if (user.role === "doctor") {
        navigate("/doctor");
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Tên đăng nhập hoặc mật khẩu không đúng",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full font-sans">
      {/* Left Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="flex items-center gap-3 mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/30">
              <HeartPulse size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-blue-600 tracking-tight">MedDiag AI</h1>
              <p className="text-slate-500 text-sm font-medium tracking-wide">smart diagnosis system</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                  className="w-full border-b-2 border-slate-200 py-2 focus:outline-none focus:border-blue-500 transition-colors bg-transparent text-slate-800 font-medium placeholder:text-slate-400 placeholder:font-normal"
                  placeholder="Nhập username..."
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full border-b-2 border-slate-200 py-2 focus:outline-none focus:border-blue-500 transition-colors bg-transparent text-slate-800 font-medium placeholder:text-slate-400 placeholder:font-normal tracking-widest"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-blue-600 font-medium">Remember me</span>
              </label>
              <a href="#" className="text-blue-600 font-medium hover:underline">
                Forgot Password ?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0d8bf0] hover:bg-blue-600 text-white py-3.5 rounded-lg font-bold transition-all shadow-md mt-4 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                "LOGIN"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-slate-500 text-sm font-medium">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-700 font-bold ml-1 hover:underline"
              >
                Sign Up
              </Link>
            </p>
            <div className="mt-4">
              <Link
                to="/"
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                ← Quay lại trang chủ
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right Image Section */}
      <div className="hidden lg:block lg:w-1/2 bg-[#2d1162] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#1b083e] to-[#3a1580] opacity-80 z-0"></div>
        <img 
          src={loginBg} 
          alt="Medical Diagnosis AI" 
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay z-10"
        />
        {/* Fallback pattern if image is too dark or light */}
        <div className="absolute inset-0 z-20 flex items-center justify-center">
             <img 
              src={loginBg} 
              alt="Medical AI Illustration" 
              className="w-full h-full object-cover"
            />
        </div>
      </div>
    </div>
  );
}
