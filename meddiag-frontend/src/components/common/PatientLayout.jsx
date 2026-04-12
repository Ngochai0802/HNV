import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  Image,
  MessageSquare,
  Calendar,
  Bell,
  LogOut,
  LogIn,
  UserPlus,
  Lock,
  HeartPulse,
} from "lucide-react";
import useAuthStore from "../../store/useAuthStore";

export default function PatientLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Hàm xử lý khi nhấn vào các mục yêu cầu đăng nhập
  const handleProtectedClick = (e, path) => {
    if (!user) {
      e.preventDefault(); // Chặn không cho chuyển trang
      // Chuyển hướng sang trang login và lưu lại vị trí cũ để sau khi login thì quay lại
      navigate("/login", { state: { from: path } });
    }
  };

  // Danh sách menu: cái nào protected: true thì phải đăng nhập mới vào được
  const navItems = [
    {
      to: "/patient",
      icon: <LayoutDashboard size={18} />,
      label: "Tổng quan",
      protected: false,
    },
    {
      to: "/patient/upload",
      icon: <Upload size={18} />,
      label: "Upload ảnh X-quang",
      protected: true,
    },
    {
      to: "/patient/images",
      icon: <Image size={18} />,
      label: "Lịch sử chẩn đoán",
      protected: true,
    },
    {
      to: "/patient/chat",
      icon: <MessageSquare size={18} />,
      label: "Tư vấn AI & Bác sĩ",
      protected: true,
    },
    {
      to: "/patient/appointments",
      icon: <Calendar size={18} />,
      label: "Đặt lịch khám",
      protected: true,
    },
    {
      to: "/patient/notifications",
      icon: <Bell size={18} />,
      label: "Thông báo",
      protected: true,
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* SIDEBAR BÊN TRÁI */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <HeartPulse size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">MedDiag AI</h1>
          </Link>
          <p className="text-slate-400 text-[10px] mt-1 uppercase font-bold tracking-widest">
            Hệ thống chẩn đoán hình ảnh
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={(e) =>
                item.protected && handleProtectedClick(e, item.to)
              }
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                location.pathname === item.to
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "hover:bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <span
                className={
                  location.pathname === item.to
                    ? "text-white"
                    : "group-hover:text-blue-400"
                }
              >
                {item.icon}
              </span>
              <span className="font-medium text-sm">{item.label}</span>

              {/* Hiện icon khóa nếu chưa đăng nhập */}
              {item.protected && !user && (
                <Lock size={14} className="ml-auto text-slate-600" />
              )}
            </Link>
          ))}
        </nav>

        {/* PHẦN THÔNG TIN USER HOẶC NÚT LOGIN Ở DƯỚI SIDEBAR */}
        <div className="p-4 border-t border-slate-800">
          {user ? (
            <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl">
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold truncate">
                  {user.fullName}
                </span>
                <span className="text-[10px] text-blue-400 font-medium">
                  Bệnh nhân
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                title="Đăng xuất"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold transition-all border border-slate-700"
            >
              <LogIn size={16} /> Đăng nhập ngay
            </Link>
          )}
        </div>
      </aside>

      {/* PHẦN NỘI DUNG CHÍNH BÊN PHẢI */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER GÓC TRÊN CÙNG */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm">
          <div>
            <h2 className="text-slate-800 font-bold text-lg leading-none">
              {navItems.find((n) => n.to === location.pathname)?.label ||
                "Chào mừng bạn"}
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              {user
                ? `Chào, ${user.fullName}`
                : "Vui lòng đăng nhập để sử dụng đầy đủ tính năng"}
            </p>
          </div>

          {/* CỤM NÚT ĐĂNG NHẬP / ĐĂNG KÝ GÓC PHẢI TRÊN */}
          {!user && (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-bold text-slate-600 hover:text-blue-600 px-4 py-2 transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-2 text-sm bg-blue-600 text-white px-5 py-2.5 rounded-full hover:bg-blue-700 transition-all font-bold shadow-md shadow-blue-600/20"
              >
                <UserPlus size={16} /> Đăng ký tài khoản
              </Link>
            </div>
          )}

          {user && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-200">
                {user.fullName?.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </header>

        {/* VÙNG HIỂN THỊ NỘI DUNG TRANG (DASHBOARD/UPLOAD/...) */}
        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
