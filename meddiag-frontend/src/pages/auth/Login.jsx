import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { login } from "../../api/auth";
import useAuthStore from "../../store/useAuthStore";
import toast from "react-hot-toast";
import { HeartPulse, User, Lock, ArrowRight } from "lucide-react";

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-center text-white">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
            <HeartPulse size={32} />
          </div>
          <h1 className="text-2xl font-bold">MedDiag AI</h1>
          <p className="text-slate-400 text-sm mt-2">
            Đăng nhập để tiếp tục chẩn đoán
          </p>
        </div>

        {/* Phần Body của Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Tên đăng nhập
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-slate-400">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  placeholder="Nhập username của bạn..."
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Mật khẩu
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-slate-400">
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  placeholder="Nhập mật khẩu..."
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-70 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Đăng nhập hệ thống{" "}
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
            </button>
          </form>

          {/* Footer chuyển hướng */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-slate-500 text-sm">
              Bạn là bệnh nhân mới?{" "}
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-700 font-bold ml-1 transition-colors"
              >
                Tạo tài khoản ngay
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
    </div>
  );
}
