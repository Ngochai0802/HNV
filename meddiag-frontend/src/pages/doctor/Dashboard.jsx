import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAssignments } from "../../api/doctor";
import { getAppointments } from "../../api/appointment";
import useAuthStore from "../../store/useAuthStore";
import lungIllustration from "../../assets/lung-illustration.png";
import {
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Calendar,
  CalendarCheck,
} from "lucide-react";
import {
  LineChart, Line, Tooltip as RechartsTooltip, ResponsiveContainer
} from "recharts";

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

export default function DoctorDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    danger: 0,
  });
  const [priorityCases, setPriorityCases] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAssignments(), getAppointments()])
      .then(([assignRes, apptRes]) => {
        const aData = assignRes.data || [];
        const appts = apptRes.data || [];

        // Stats
        const dangerCount = aData.filter(a => a.status === "pending" && (a.image?.aiResult?.severityLevel === "Nguy hiểm" || a.image?.aiResult?.severityLevel === "danger")).length;
        setStats({
          total: aData.length,
          pending: aData.filter((a) => a.status === "pending").length,
          danger: dangerCount,
          completed: aData.filter((a) => a.status === "completed").length,
        });

        // Chart Data (7 days completed)
        const last7Days = [...Array(7)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return {
            dateStr: d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
            dateObj: d,
            count: 0,
          };
        });
        
        aData.filter(a => a.status === "completed").forEach((a) => {
          const d = new Date(a.assignedAt);
          const match = last7Days.find(
            (day) => day.dateObj.getDate() === d.getDate() && day.dateObj.getMonth() === d.getMonth()
          );
          if (match) match.count += 1;
        });
        setChartData(last7Days);

        // Priority Cases
        const pending = aData.filter(a => a.status === "pending");
        // Sort: Danger first, then oldest
        pending.sort((a, b) => {
            const aDanger = (a.image?.aiResult?.severityLevel === "Nguy hiểm" || a.image?.aiResult?.severityLevel === "danger") ? 1 : 0;
            const bDanger = (b.image?.aiResult?.severityLevel === "Nguy hiểm" || b.image?.aiResult?.severityLevel === "danger") ? 1 : 0;
            if (aDanger !== bDanger) return bDanger - aDanger;
            return new Date(a.image?.uploadDate) - new Date(b.image?.uploadDate);
        });
        setPriorityCases(pending.slice(0, 5));

        // Upcoming appointments (next 2)
        const today = new Date();
        const upcomingAppts = appts.filter(a => {
            const d = new Date(a.appointmentTime);
            return a.status !== "cancelled" && d > today;
        });
        upcomingAppts.sort((a, b) => new Date(a.appointmentTime) - new Date(b.appointmentTime));
        setAppointments(upcomingAppts.slice(0, 2));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      label: "Tổng ca",
      value: stats.total,
      icon: <ClipboardList size={22} />,
      gradient: "from-blue-500 to-blue-600",
      sparkColor: "#93c5fd",
    },
    {
      label: "Chờ xử lý",
      value: stats.pending,
      icon: <Clock size={22} />,
      gradient: "from-amber-500 to-orange-500",
      sparkColor: "#fcd34d",
    },
    {
      label: "Ca khẩn cấp (AI cảnh báo)",
      value: stats.danger,
      icon: <AlertCircle size={22} />,
      gradient: "from-red-500 to-rose-600",
      sparkColor: "#fca5a5",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* ── HERO BANNER ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 to-teal-500 rounded-2xl px-8 py-12 text-white shadow-md">
        <div 
            className="absolute right-0 top-0 h-full w-auto opacity-40 pointer-events-none mix-blend-overlay"
            style={{ maskImage: 'linear-gradient(to right, transparent, black 40%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 40%)' }}
        >
            <img src={lungIllustration} alt="" className="h-full object-cover" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl font-bold mb-2">Xin chào, BS. {user?.fullName}</h1>
          <p className="text-teal-50 text-base">Quản lý và chẩn đoán các ca bệnh được phân công cho bạn.</p>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 bg-gradient-to-br ${c.gradient} rounded-xl flex items-center justify-center text-white shadow-md`}>
                {c.icon}
              </div>
              <Sparkline color={c.sparkColor} />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-800">{c.value}</p>
              <p className="text-slate-500 text-sm font-medium mt-1">{c.label}</p>
            </div>
          </div>
        ))}

        {/* Special Completed Card with Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center text-white shadow-md">
                <CheckCircle size={22} />
              </div>
              <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Biểu đồ chẩn đoán</p>
              </div>
            </div>
            <div className="flex items-end justify-between gap-4">
                <div>
                    <p className="text-3xl font-extrabold text-slate-800">{stats.completed}</p>
                    <p className="text-slate-500 text-sm font-medium mt-1">Hoàn thành</p>
                </div>
                <div className="h-10 flex-1 min-w-[60px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} />
                            <RechartsTooltip contentStyle={{ fontSize: '12px', padding: '4px 8px', borderRadius: '8px' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      </div>

      {/* ── MAIN CONTENT: 2 COLUMNS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Priority Cases */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Ca cần ưu tiên xử lý</h2>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {priorityCases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <CheckCircle size={40} className="text-emerald-400 mb-3 opacity-50" />
                <p>Tuyệt vời! Không có ca nào đang chờ xử lý.</p>
              </div>
            ) : (
              priorityCases.map((a) => {
                const aiResult = a.image?.aiResult;
                const isDanger = aiResult?.severityLevel === "Nguy hiểm" || aiResult?.severityLevel === "danger";
                
                return (
                  <div key={a.assignmentId} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-50 transition-colors">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 bg-slate-900 rounded-xl overflow-hidden flex-shrink-0 relative hidden sm:block">
                        <img 
                            src={`http://localhost:5255${a.image?.imageUrl}`} 
                            alt="X-ray" 
                            className="w-full h-full object-cover opacity-80"
                        />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 truncate text-base">{a.image?.patientName}</p>
                        <p className="text-slate-400 text-xs mt-1">PX-{a.image?.id} • Tải lên: {new Date(a.image?.uploadDate).toLocaleTimeString("vi-VN", {hour: '2-digit', minute: '2-digit'})}</p>
                    </div>

                    {/* AI Badge */}
                    <div className="flex flex-col sm:items-center w-auto sm:w-40 flex-shrink-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">AI Prediction</p>
                        {aiResult ? (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${isDanger ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isDanger ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                {aiResult.predictionLabel} - {(aiResult.confidenceScore * 100).toFixed(0)}%
                            </span>
                        ) : (
                            <span className="text-xs text-slate-400 font-medium">Chưa có kết quả</span>
                        )}
                    </div>

                    {/* Action */}
                    <Link
                        to={`/doctor/cases/${a.image?.id}`}
                        className={`mt-2 sm:mt-0 text-center px-4 py-2 rounded-xl text-sm font-bold transition-all border flex-shrink-0 ${isDanger ? 'bg-white border-red-200 text-red-600 hover:bg-red-50' : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'}`}
                    >
                        Chẩn đoán ngay
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Upcoming Appointments */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                <CalendarCheck size={18} className="text-teal-600" />
                <h2 className="text-base font-bold text-slate-800">Lịch khám bệnh sắp tới</h2>
            </div>
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-end mb-4">
                    <Link to="/doctor/appointments" className="text-xs font-bold text-teal-600 hover:underline">Xem tất cả</Link>
                </div>

                <div className="space-y-4 flex-1">
                    {appointments.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Không có lịch hẹn nào sắp tới.</p>
                        </div>
                    ) : (
                        appointments.map((appt, idx) => {
                            const d = new Date(appt.appointmentTime);
                            const timeStr = d.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });
                            const dateStr = d.toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit' });
                            
                            return (
                                <div key={appt.id || idx} className="flex gap-4 relative">
                                    {/* Timeline line */}
                                    <div className="absolute left-[3px] top-6 bottom-[-20px] w-0.5 bg-slate-100 last:hidden" />
                                    
                                    <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0 relative z-10 outline outline-4 outline-white" />
                                    
                                    <div className="flex-1 bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:border-teal-200 transition-colors">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-bold text-teal-700 text-sm">{timeStr} - {dateStr}</p>
                                            <User size={14} className="text-slate-400" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-800">BN: {appt.patientName}</p>
                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{appt.note || "Khám bệnh"}</p>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}
