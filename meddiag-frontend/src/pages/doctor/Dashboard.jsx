import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAssignments } from "../../api/doctor";
import useAuthStore from "../../store/useAuthStore";
import {
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default function DoctorDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    inProgress: 0,
  });
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    getAssignments()
      .then((res) => {
        const data = res.data;
        setStats({
          total: data.length,
          pending: data.filter((a) => a.status === "pending").length,
          inProgress: data.filter((a) => a.status === "in_progress").length,
          completed: data.filter((a) => a.status === "completed").length,
        });
        setRecent(data.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  const cards = [
    {
      label: "Tổng ca",
      value: stats.total,
      icon: <ClipboardList size={22} />,
      gradient: "from-blue-500 to-blue-600",
    },
    {
      label: "Chờ xử lý",
      value: stats.pending,
      icon: <Clock size={22} />,
      gradient: "from-amber-500 to-orange-500",
    },
    {
      label: "Đang xử lý",
      value: stats.inProgress,
      icon: <TrendingUp size={22} />,
      gradient: "from-purple-500 to-violet-500",
    },
    {
      label: "Hoàn thành",
      value: stats.completed,
      icon: <CheckCircle size={22} />,
      gradient: "from-emerald-500 to-green-500",
    },
  ];

  const STATUS_LABEL = {
    completed: { text: "Hoàn thành", color: "bg-emerald-100 text-emerald-700" },
    pending: { text: "Chờ xử lý", color: "bg-amber-100 text-amber-700" },
    in_progress: { text: "Đang xử lý", color: "bg-blue-100 text-blue-700" },
  };

  return (
    <div className="space-y-6">
      {/* Greeting - Professional */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-teal-900 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold">
            Xin chào, BS. {user?.fullName}
          </h1>
          <p className="text-slate-400 mt-2">
            Quản lý và chẩn đoán các ca bệnh được phân công cho bạn.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* Recent cases */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Ca gần đây</h2>
          <Link
            to="/doctor/cases"
            className="text-sm text-teal-600 font-medium hover:text-teal-700 flex items-center gap-1 transition-colors"
          >
            Xem tất cả <ArrowRight size={14} />
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {recent.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList
                size={36}
                className="mx-auto mb-3 text-slate-300"
              />
              <p className="text-slate-400">Chưa có ca nào được phân công</p>
            </div>
          ) : (
            recent.map((a) => {
              const sl = STATUS_LABEL[a.status] || {
                text: a.status,
                color: "bg-slate-100 text-slate-600",
              };
              return (
                <Link
                  key={a.assignmentId}
                  to={`/doctor/cases/${a.image.id}`}
                  className="flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600 flex-shrink-0">
                    <ClipboardList size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">
                      {a.image.fileName}
                    </p>
                    <p className="text-slate-500 text-sm">
                      BN: {a.image.patientName}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${sl.color}`}
                  >
                    {sl.text}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
