import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUsers, getAdminImages, getAutoAssignStatus } from "../../api/admin";
import {
  Users, Image as ImageIcon, Zap, Activity, BrainCircuit,
  CheckCircle, Clock, UserCheck
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0, doctors: 0, patients: 0, totalImages: 0,
  });
  const [images,      setImages]      = useState([]);
  const [users,       setUsers]       = useState([]);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([getUsers(), getAdminImages(), getAutoAssignStatus()])
      .then(([usersRes, imgRes, autoRes]) => {
        const uData = usersRes.data || [];
        const iData = imgRes.data  || [];
        setUsers(uData);
        setImages(iData);
        setAutoEnabled(autoRes.data?.isEnabled || false);
        setStats({
          totalUsers:  uData.length,
          doctors:     uData.filter((u) => u.role === "doctor").length,
          patients:    uData.filter((u) => u.role === "patient").length,
          totalImages: iData.length,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Biểu đồ lưu lượng 7 ngày
  const processTrafficData = () => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        dateStr: d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
        dateObj: d,
        count: 0,
      };
    });
    images.forEach((img) => {
      const d = new Date(img.uploadDate);
      const match = last7Days.find(
        (day) => day.dateObj.getDate() === d.getDate() && day.dateObj.getMonth() === d.getMonth()
      );
      if (match) match.count += 1;
    });
    return last7Days.map((item) => ({ name: item.dateStr, Uploads: item.count }));
  };

  // Biểu đồ tròn trạng thái
  const processPieData = () => {
    const counts = {};
    images.forEach((img) => {
      let label = "Khác";
      if (img.status === "pending" || img.status === "processed") label = "Chờ xử lý";
      else if (img.status === "assigned")  label = "Đã phân công";
      else if (img.status === "diagnosed") label = "Đã chẩn đoán";
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b"];

  // Ca bệnh cần chú ý — chỉ lấy ảnh chưa phân công (pending, processed), sắp xếp cũ nhất lên đầu
  const priorityCases = images
    .filter((img) => img.status === "pending" || img.status === "processed")
    .sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate))
    .slice(0, 5);

  // Nhật ký hoạt động
  const activities = [
    ...images.map((img) => ({
      id:   `img_${img.id}`,
      type: "image",
      text: `${img.patientName || "Bệnh nhân"} vừa tải lên ảnh X-quang mới.`,
      time: new Date(img.uploadDate),
    })),
    ...users.map((u) => ({
      id:   `user_${u.userId || u.id}`,
      type: "user",
      text: `${u.fullName || u.username} vừa đăng ký tài khoản (${u.role}).`,
      time: new Date(u.createdAt || Date.now()),
    })),
  ]
    .sort((a, b) => b.time - a.time)
    .slice(0, 6);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pieData = processPieData();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tổng quan</h1>
          <p className="text-slate-500 mt-1">Trung tâm điều khiển và giám sát hệ thống MedDiag AI.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-sm rounded-lg border border-emerald-200">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            AI Online
          </span>
          {autoEnabled ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 font-bold text-sm rounded-lg border border-blue-200">
              <Zap size={15} /> Auto-Assign ON
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 font-bold text-sm rounded-lg border border-slate-200">
              <UserCheck size={15} /> Auto-Assign OFF
            </span>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Users size={26} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Tổng người dùng</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalUsers}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <ImageIcon size={26} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Ảnh X-quang</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalImages}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
            <BrainCircuit size={26} />
          </div>
          <div>
            <p className="text-sm text-slate-500">AI Model v2.1</p>
            <p className="text-2xl font-bold text-slate-800">92.4%</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 lg:col-span-2">
          <h2 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Activity size={18} className="text-blue-500" /> Lưu lượng Upload (7 ngày qua)
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processTrafficData()} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0/0.1)" }} />
                <Bar dataKey="Uploads" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Activity size={18} className="text-purple-500" /> Trạng thái xử lý ảnh
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {pieData.length > 0 && (
                  <Pie data={pieData} innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                )}
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ca bệnh cần chú ý */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 lg:col-span-2 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-base font-bold text-slate-800">
              🔔 Ca bệnh cần chú ý
              <span className="ml-2 text-xs text-slate-400 font-normal">(ảnh chờ phân công lâu nhất)</span>
            </h2>
            <Link to="/admin/images" className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
              Xem tất cả
            </Link>
          </div>
          {priorityCases.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {priorityCases.map((img) => {
                const hoursAgo = Math.round((Date.now() - new Date(img.uploadDate)) / (1000 * 60 * 60));
                const isUrgent = hoursAgo > 24;
                return (
                  <div key={img.id} className={`p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors ${isUrgent ? "bg-red-50/30" : ""}`}>
                    <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={`http://localhost:5255${img.imageUrl}`}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{img.patientName}</p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock size={11} />
                        {hoursAgo < 1 ? "Vừa upload" : hoursAgo < 24 ? `${hoursAgo} giờ trước` : `${Math.round(hoursAgo / 24)} ngày trước`}
                        {isUrgent && <span className="ml-1 text-red-500 font-semibold">⚠ Chờ quá lâu!</span>}
                      </p>
                    </div>
                    <Link to="/admin/images" className="text-xs font-bold text-blue-600 hover:underline flex-shrink-0">
                      Phân công
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <CheckCircle size={32} className="mx-auto mb-3 text-emerald-400 opacity-50" />
              <p>Không có ảnh nào đang chờ phân công.</p>
            </div>
          )}
        </div>

        {/* Hoạt động gần đây */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Clock size={18} className="text-blue-500" /> Hoạt động gần đây
            </h2>
          </div>
          <div className="p-5 space-y-4">
            {activities.length > 0 ? activities.map((act, i) => (
              <div key={act.id + i} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${act.type === "image" ? "bg-blue-500" : "bg-purple-500"}`} />
                <div>
                  <p className="text-sm text-slate-700">{act.text}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {act.time.toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                  </p>
                </div>
              </div>
            )) : (
              <p className="text-center text-slate-400 text-sm">Chưa có hoạt động nào.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
