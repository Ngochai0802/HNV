import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyImages } from "../../api/patient";
import useAuthStore from "../../store/useAuthStore";
import {
  Upload,
  Image,
  CheckCircle,
  Clock,
  ArrowRight,
  Shield,
  Brain,
  Stethoscope,
  Zap,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    diagnosed: 0,
  });

  useEffect(() => {
    if (!user) return;
    getMyImages()
      .then((res) => {
        const imgs = res.data;
        setStats({
          total: imgs.length,
          pending: imgs.filter((i) => i.status === "pending").length,
          diagnosed: imgs.filter((i) => i.hasDiagnosis).length,
        });
      })
      .catch(() => {});
  }, [user]);

  const cards = [
    {
      label: "Tổng ảnh đã upload",
      value: stats.total,
      icon: <Image size={22} />,
      color: "bg-blue-500",
      gradient: "from-blue-500 to-blue-600",
    },
    {
      label: "Chờ phân tích",
      value: stats.pending,
      icon: <Clock size={22} />,
      color: "bg-amber-500",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      label: "Đã chẩn đoán",
      value: stats.diagnosed,
      icon: <CheckCircle size={22} />,
      color: "bg-emerald-500",
      gradient: "from-emerald-500 to-green-500",
    },
  ];

  // Landing page cho khách chưa đăng nhập
  if (!user) {
    return (
      <div className="space-y-12 max-w-5xl mx-auto">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-10 md:p-14 text-white">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-1.5 mb-6">
              <Zap size={14} className="text-blue-400" />
              <span className="text-sm font-medium text-blue-300">
                Chẩn đoán X-quang bằng AI
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight max-w-lg">
              Hệ thống hỗ trợ chẩn đoán{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                hình ảnh y tế
              </span>
            </h1>
            <p className="text-slate-400 mt-4 max-w-md leading-relaxed">
              Upload ảnh X-quang phổi, nhận phân tích từ AI và kết quả chẩn đoán
              từ bác sĩ chuyên khoa nhanh chóng, chính xác.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                to="/login"
                className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all shadow-lg shadow-white/10 flex items-center gap-2"
              >
                Đăng nhập
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/register"
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-500 transition-all border border-blue-500 flex items-center gap-2"
              >
                Tạo tài khoản mới
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: <Brain size={24} />,
              title: "AI phân tích tự động",
              desc: "Mô hình AI phân tích ảnh X-quang và phát hiện bất thường trong vài giây.",
              iconBg: "bg-purple-100 text-purple-600",
            },
            {
              icon: <Stethoscope size={24} />,
              title: "Bác sĩ chẩn đoán",
              desc: "Bác sĩ chuyên khoa xem xét kết quả AI và đưa ra chẩn đoán cuối cùng.",
              iconBg: "bg-teal-100 text-teal-600",
            },
            {
              icon: <Shield size={24} />,
              title: "Bảo mật dữ liệu",
              desc: "Thông tin bệnh nhân được bảo mật tuyệt đối, tuân thủ tiêu chuẩn y tế.",
              iconBg: "bg-blue-100 text-blue-600",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${f.iconBg} mb-4`}
              >
                {f.icon}
              </div>
              <h3 className="font-bold text-slate-800 text-lg">{f.title}</h3>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Dashboard cho bệnh nhân đã đăng nhập
  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-blue-900 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold">Chào, {user.fullName}</h1>
          <p className="text-slate-400 mt-2">
            Theo dõi tình trạng ảnh X-quang và kết quả chẩn đoán của bạn tại
            đây.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300"
          >
            <div
              className={`w-10 h-10 bg-gradient-to-br ${c.gradient} rounded-xl flex items-center justify-center text-white mb-3 shadow-lg`}
            >
              {c.icon}
            </div>
            <p className="text-2xl font-bold text-slate-800">{c.value}</p>
            <p className="text-slate-500 text-sm mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/patient/upload"
          className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 flex items-center gap-4 group"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 group-hover:shadow-lg group-hover:shadow-blue-600/20">
            <Upload size={24} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-800">Upload ảnh X-quang</p>
            <p className="text-slate-500 text-sm">
              Tải lên ảnh mới để phân tích
            </p>
          </div>
          <ArrowRight
            size={18}
            className="text-slate-300 group-hover:text-blue-600 transition-colors"
          />
        </Link>
        <Link
          to="/patient/images"
          className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300 flex items-center gap-4 group"
        >
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 group-hover:shadow-lg group-hover:shadow-emerald-600/20">
            <Image size={24} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-800">Xem lịch sử chẩn đoán</p>
            <p className="text-slate-500 text-sm">
              Xem lại tất cả ảnh đã upload
            </p>
          </div>
          <ArrowRight
            size={18}
            className="text-slate-300 group-hover:text-emerald-600 transition-colors"
          />
        </Link>
      </div>
    </div>
  );
}
