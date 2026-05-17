import { useEffect, useState } from "react";
import lungIllustration from "../../assets/lung-illustration.png";
import { Link } from "react-router-dom";
import { getMyImages } from "../../api/patient";
import { getAppointments } from "../../api/appointment";
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
  Calendar,
  CalendarCheck,
  User,
  Activity,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react";

/* ─── tiny sparkline SVG ─── */
function Sparkline({ color = "#60a5fa" }) {
  const pts = "0,28 8,22 16,26 24,14 32,18 40,8 48,14 56,6 64,10 72,4";
  return (
    <svg width="72" height="32" viewBox="0 0 72 32" fill="none">
      <polyline
        points={pts}
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  );
}

/* ─── countdown / days-remaining helper ─── */
function daysUntil(dateStr) {
  const now = new Date();
  const target = new Date(dateStr);
  // So sánh theo ngày lịch (bỏ phần giờ/phút/giây)
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((targetDay - nowDay) / (1000 * 60 * 60 * 24));
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ total: 0, pending: 0, diagnosed: 0 });
  const [recentImage, setRecentImage] = useState(null);
  const [nextAppointment, setNextAppointment] = useState(null);
  const [loadingAppt, setLoadingAppt] = useState(true);

  useEffect(() => {
    if (!user) return;
    // images
    getMyImages()
      .then((res) => {
        const imgs = res.data || [];
        setStats({
          total: imgs.length,
          pending: imgs.filter((i) => i.status === "pending").length,
          diagnosed: imgs.filter((i) => i.hasDiagnosis).length,
        });
        // most recent diagnosed image
        const diagnosed = imgs.filter((i) => i.hasDiagnosis);
        if (diagnosed.length > 0) {
          const sorted = [...diagnosed].sort(
            (a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)
          );
          setRecentImage(sorted[0]);
        }
      })
      .catch(() => {});

    // next appointment
    getAppointments()
      .then((res) => {
        const list = (res.data || []).filter((a) => {
          const d = new Date(a.appointmentTime);
          return d > new Date() && a.status !== "cancelled";
        });
        list.sort(
          (a, b) =>
            new Date(a.appointmentTime) - new Date(b.appointmentTime)
        );
        setNextAppointment(list[0] || null);
      })
      .catch(() => {})
      .finally(() => setLoadingAppt(false));
  }, [user]);

  /* ── STAT CARDS data ── */
  const cards = [
    {
      label: "Tổng ảnh đã upload",
      value: stats.total,
      icon: <Activity size={20} />,
      gradient: "from-[#3b82f6] to-[#1d4ed8]",
      sparkColor: "#93c5fd",
      lightBg: "bg-blue-50",
      textColor: "text-blue-600",
      
    },
    {
      label: "Đang chờ phân tích",
      value: stats.pending,
      icon: <Clock size={20} />,
      gradient: "from-[#f59e0b] to-[#d97706]",
      sparkColor: "#fcd34d",
      lightBg: "bg-amber-50",
      textColor: "text-amber-600",
      trend: "Đang xử lý",
    },
    {
      label: "Đã chẩn đoán",
      value: stats.diagnosed,
      icon: <CheckCircle size={20} />,
      gradient: "from-[#10b981] to-[#059669]",
      sparkColor: "#6ee7b7",
      lightBg: "bg-emerald-50",
      textColor: "text-emerald-600",
      trend: "Hoàn thành",
    },
    {
      label: "Độ chính xác AI",
      value: "92.4%",
      icon: <TrendingUp size={20} />,
      gradient: "from-[#8b5cf6] to-[#7c3aed]",
      sparkColor: "#c4b5fd",
      lightBg: "bg-violet-50",
      textColor: "text-violet-600",
      trend: "Model v2.1",
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

  /* ══════════════════════════════════════
     DASHBOARD (đã đăng nhập)
  ══════════════════════════════════════ */
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Chào buổi sáng";
    if (h < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  })();

  return (
    <div className="space-y-6">
      {/* ── HERO BANNER ── */}
      <div
        className="relative overflow-hidden rounded-2xl text-white"
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 45%, #2563eb 75%, #3b82f6 100%)",
          minHeight: 144,
        }}
      >
        {/* Lung illustration - positioned right */}
        <img
          src={lungIllustration}
          alt=""
          className="absolute right-0 top-0 h-full w-auto object-cover object-left select-none pointer-events-none"
          style={{ opacity: 0.92 }}
        />

        {/* Left fade overlay so text is readable */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, #1e3a8a 0%, #1d4ed8 38%, rgba(29,78,216,0.7) 58%, transparent 100%)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 px-8 py-5 max-w-lg">
          <p className="text-blue-200 text-sm font-medium mb-1">{greeting} 👋</p>
          <h1 className="text-2xl font-bold">{user.fullName}</h1>
          <p className="text-blue-200 text-sm mt-2 leading-relaxed">
            Hệ thống giúp bạn theo dõi kết quả X-quang và lịch tái khám, chăm sóc sức khoẻ dễ dàng hơn.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link
              to="/patient/upload"
              className="flex items-center gap-2 bg-white text-blue-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-50 transition-all shadow-md"
            >
              <Upload size={15} /> Upload ảnh X-quang
            </Link>
            <Link
              to="/patient/images"
              className="flex items-center gap-2 bg-white/10 text-white border border-white/25 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-white/20 transition-all backdrop-blur-sm"
            >
              <Image size={15} /> Xem lịch sử
            </Link>
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center text-white shadow-md`}>
                {c.icon}
              </div>
              <Sparkline color={c.sparkColor} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-800">{c.value}</p>
              <p className="text-slate-500 text-xs mt-0.5">{c.label}</p>
            </div>
            <div className={`text-xs font-semibold ${c.textColor} ${c.lightBg} rounded-lg px-2 py-1 w-fit`}>
              {c.trend}
            </div>
          </div>
        ))}
      </div>

      {/* ── BOTTOM SECTION: Upload + Recent + Next Appointment ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        
        {/* Recent diagnosis */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4 min-h-[420px]">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm">Kết quả phân tích gần nhất</h2>
            <Link to="/patient/images" className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
              Xem tất cả <ChevronRight size={12} />
            </Link>
          </div>

          {recentImage ? (
            <div className="flex flex-col gap-3 flex-1">
              {/* X-ray thumbnail */}
              <div className="relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center">
                {recentImage.imageUrl ? (
                  <img
                    src={`http://localhost:5255${recentImage.imageUrl}`}
                    alt="X-quang gần nhất"
                    className="w-full h-full object-cover opacity-80"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <Image size={32} />
                    <span className="text-xs">Không có ảnh preview</span>
                  </div>
                )}
                <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-lg backdrop-blur-sm">
                  {new Date(recentImage.uploadDate).toLocaleDateString("vi-VN")}
                </span>
              </div>

              {/* result badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-lg">
                  <CheckCircle size={12} /> Đã chẩn đoán
                </span>
                {recentImage.aiResult && (
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold px-3 py-1 rounded-lg">
                    {recentImage.aiResult}
                  </span>
                )}
              </div>

              <Link
                to={`/patient/images/${recentImage.id}`}
                className="w-full text-center text-sm font-bold text-blue-600 border border-blue-200 hover:bg-blue-50 py-2 rounded-xl transition-all"
              >
                Xem chi tiết kết quả
              </Link>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center">
                <Image size={24} className="text-slate-300" />
              </div>
              <p className="text-slate-500 text-sm font-medium">Chưa có kết quả nào</p>
              <p className="text-slate-400 text-xs">Upload ảnh X-quang để bắt đầu phân tích</p>
            </div>
          )}
        </div>

        {/* ── NEXT APPOINTMENT ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4 min-h-[420px]">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <CalendarCheck size={16} className="text-blue-500" />
              Nhắc nhở lịch khám
            </h2>
            <Link to="/patient/appointments" className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
              Quản lý <ChevronRight size={12} />
            </Link>
          </div>

          {loadingAppt ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : nextAppointment ? (() => {
            const dt = new Date(nextAppointment.appointmentTime);
            const days = daysUntil(nextAppointment.appointmentTime);
            const isToday = days === 0;
            const isTomorrow = days === 1;
            const urgencyColor = isToday
              ? "from-red-500 to-rose-600"
              : isTomorrow
              ? "from-amber-500 to-orange-500"
              : "from-blue-500 to-blue-600";
            const urgencyBg = isToday ? "bg-red-50" : isTomorrow ? "bg-amber-50" : "bg-blue-50";
            const urgencyText = isToday ? "text-red-600" : isTomorrow ? "text-amber-600" : "text-blue-600";
            const urgencyLabel = isToday ? "Hôm nay!" : isTomorrow ? "Ngày mai" : `${days} ngày nữa`;
            return (
              <div className="flex flex-col gap-4 flex-1">
                {/* countdown badge */}
                <div className={`w-full rounded-xl p-4 bg-gradient-to-br ${urgencyColor} text-white flex items-center justify-between shadow-md`}>
                  <div>
                    <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Lịch khám tiếp theo</p>
                    <p className="text-2xl font-extrabold mt-0.5">{urgencyLabel}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
                    <Calendar size={22} className="text-white" />
                  </div>
                </div>

                {/* appointment details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User size={14} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Bác sĩ</p>
                      <p className="font-bold text-slate-800 text-sm">BS. {nextAppointment.doctorName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Clock size={14} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Thời gian</p>
                      <p className="font-bold text-slate-800 text-sm">
                        {dt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        {" · "}
                        {dt.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" })}
                      </p>
                    </div>
                  </div>

                  {nextAppointment.note && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <AlertCircle size={14} className="text-violet-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Ghi chú</p>
                        <p className="text-slate-600 text-sm line-clamp-2">{nextAppointment.note}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* status badge */}
                <div className={`flex items-center gap-1.5 text-xs font-bold ${urgencyText} ${urgencyBg} rounded-lg px-3 py-1.5 w-fit`}>
                  <Sparkles size={11} /> {nextAppointment.status === "confirmed" ? "Đã xác nhận" : "Chờ xác nhận"}
                </div>

                <Link
                  to="/patient/appointments"
                  className="mt-auto w-full text-center text-sm font-bold text-blue-600 border border-blue-200 hover:bg-blue-50 py-2 rounded-xl transition-all"
                >
                  Xem tất cả lịch khám
                </Link>
              </div>
            );
          })() : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                <Calendar size={24} className="text-blue-300" />
              </div>
              <p className="text-slate-500 text-sm font-medium">Chưa có lịch khám sắp tới</p>
              <p className="text-slate-400 text-xs">Đặt lịch để khám với bác sĩ chuyên khoa</p>
              <Link
                to="/patient/appointments"
                className="mt-2 flex items-center gap-2 bg-blue-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/20"
              >
                <Calendar size={14} /> Đặt lịch ngay
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
