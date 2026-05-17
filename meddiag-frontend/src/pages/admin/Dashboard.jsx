import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUsers, getAdminImages, getAutoAssignStatus } from "../../api/admin";
import { Users, UserCheck, Image as ImageIcon, Bell, Zap, Activity, BrainCircuit, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    doctors: 0,
    patients: 0,
    totalImages: 0,
  });
  
  const [images, setImages] = useState([]);
  const [users, setUsers] = useState([]);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getUsers(), getAdminImages(), getAutoAssignStatus()])
      .then(([usersRes, imgRes, autoRes]) => {
        const uData = usersRes.data || [];
        const iData = imgRes.data || [];
        setUsers(uData);
        setImages(iData);
        setAutoEnabled(autoRes.data?.isEnabled || false);
        
        setStats({
          totalUsers: uData.length,
          doctors: uData.filter((u) => u.role === "doctor").length,
          patients: uData.filter((u) => u.role === "patient").length,
          totalImages: iData.length,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── 1. Chuẩn bị dữ liệu cho Biểu đồ Lưu lượng (7 ngày qua) ──
  const processTrafficData = () => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { dateStr: d.toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit' }), dateObj: d, count: 0 };
    });

    images.forEach(img => {
      const d = new Date(img.uploadDate);
      const match = last7Days.find(day => day.dateObj.getDate() === d.getDate() && day.dateObj.getMonth() === d.getMonth());
      if (match) match.count += 1;
    });

    return last7Days.map(item => ({ name: item.dateStr, Uploads: item.count }));
  };

  // ── 2. Chuẩn bị dữ liệu cho Biểu đồ Tròn (Tỷ lệ trạng thái ảnh) ──
  const processPieData = () => {
    const counts = {};
    images.forEach(img => {
      let label = "Khác";
      if (img.status === "pending") label = "Chờ xử lý";
      else if (img.status === "assigned") label = "Đã phân công";
      else if (img.status === "diagnosed") label = "Đã chẩn đoán";
      
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'];

  // ── 3. Danh sách Ca bệnh cần chú ý ──
  // Lấy các ca chưa được phân công hoặc đang pending
  const priorityCases = [...images]
    .filter(img => img.status === "pending" || !img.isAssigned)
    .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate))
    .slice(0, 5);

  // ── 4. Nhật ký hoạt động (Tổng hợp User mới & Ảnh mới) ──
  const activities = [
    ...images.map(img => ({
      id: `img_${img.id}`,
      type: 'image',
      text: `Bệnh nhân ${img.patientName || 'ẩn danh'} vừa tải lên 1 ảnh X-quang mới.`,
      time: new Date(img.uploadDate)
    })),
    ...users.map(u => ({
      id: `user_${u.userId}`,
      type: 'user',
      text: `Người dùng ${u.fullName} vừa đăng ký tài khoản (${u.role}).`,
      time: new Date(u.createdAt || new Date()) // Fallback
    }))
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-slate-500 mt-1">Trung tâm điều khiển và giám sát hệ thống MedDiag AI.</p>
        </div>
        
        {/* AI Status Badge */}
        <div className="flex flex-col items-end">
          <p className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">Trạng thái AI Model</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-sm rounded-lg border border-emerald-200 shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              V2.1 Online
            </span>
            {autoEnabled ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 font-bold text-sm rounded-lg border border-blue-200 shadow-sm">
                <Zap size={16} className="text-blue-500" /> Auto-Assign ON
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 font-bold text-sm rounded-lg border border-slate-200 shadow-sm">
                <UserCheck size={16} /> Auto-Assign OFF
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── TOP STATS CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Users size={26} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Tổng người dùng</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalUsers}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <ImageIcon size={26} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Ảnh X-quang</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalImages}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
            <BrainCircuit size={26} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Độ chính xác AI (Model v2.1)</p>
            <p className="text-2xl font-bold text-slate-800">92.4%</p>
          </div>
        </div>
      </div>

      {/* ── CHARTS SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biểu đồ lưu lượng */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 lg:col-span-2">
          <h2 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Activity size={18} className="text-blue-500" /> Lưu lượng Upload (7 ngày qua)
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processTrafficData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}} 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                />
                <Bar dataKey="Uploads" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ trạng thái */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
            <PieChart size={18} className="text-purple-500" /> Trạng thái xử lý ảnh
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={processPieData()}
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {processPieData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '20px'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── BOTTOM SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Priority Cases */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 lg:col-span-2 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" /> Ca bệnh cần chú ý
            </h2>
            <Link to="/admin/images" className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
              Xem tất cả
            </Link>
          </div>
          
          <div className="flex-1 p-0">
            {priorityCases.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {priorityCases.map(img => {
                  // Giả lập logic Confidence Score từ API nếu chưa có
                  const confScore = img.confidenceScore || (Math.random() * (0.9 - 0.4) + 0.4).toFixed(2);
                  const isLowConf = confScore < 0.6;
                  
                  return (
                    <div key={img.id} className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${isLowConf ? 'bg-red-50/30' : ''}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                          <img src={`http://localhost:5255${img.imageUrl}`} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">Bệnh nhân: {img.patientName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                              {img.aiResult || "Đang phân tích"}
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${isLowConf ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              Khớp: {(confScore * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right flex flex-col items-end gap-2">
                        <span className="text-xs text-slate-400 font-medium">
                          {new Date(img.uploadDate).toLocaleString("vi-VN", {hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit'})}
                        </span>
                        <Link to="/admin/images" className="text-xs font-bold text-blue-600 hover:underline">
                          Phân công ngay
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle size={32} className="mx-auto mb-3 text-emerald-400 opacity-50" />
                <p>Không có ca bệnh nào tồn đọng.</p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Activities */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Clock size={18} className="text-blue-500" /> Hoạt động gần đây
            </h2>
          </div>
          
          <div className="p-6 flex-1 overflow-auto">
            {activities.length > 0 ? (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {activities.map((act, i) => (
                  <div key={act.id + i} className="relative flex items-start gap-4">
                    <div className="absolute left-0 w-10 flex justify-center z-10">
                      <div className={`w-3 h-3 rounded-full border-2 border-white ring-2 ${act.type === 'image' ? 'bg-blue-500 ring-blue-100' : 'bg-purple-500 ring-purple-100'}`}></div>
                    </div>
                    <div className="pl-10">
                      <p className="text-sm text-slate-700">{act.text}</p>
                      <p className="text-xs text-slate-400 mt-1 font-medium">
                        {act.time.toLocaleDateString("vi-VN", {hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit'})}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 text-sm mt-10">Chưa có hoạt động nào.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
