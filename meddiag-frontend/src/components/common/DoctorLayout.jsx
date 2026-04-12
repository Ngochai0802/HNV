import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  MessageSquare,
  Calendar,
  Bell,
  LogOut,
  HeartPulse,
} from "lucide-react";
import useAuthStore from "../../store/useAuthStore";

export default function DoctorLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    {
      to: "/doctor",
      icon: <LayoutDashboard size={18} />,
      label: "Tổng quan",
    },
    {
      to: "/doctor/cases",
      icon: <ClipboardList size={18} />,
      label: "Danh sách ca",
    },
    {
      to: "/doctor/chat",
      icon: <MessageSquare size={18} />,
      label: "Tin nhắn",
    },
    {
      to: "/doctor/appointments",
      icon: <Calendar size={18} />,
      label: "Lịch khám",
    },
    {
      to: "/doctor/notifications",
      icon: <Bell size={18} />,
      label: "Thông báo",
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-800">
          <Link to="/doctor" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
              <HeartPulse size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">MedDiag AI</h1>
          </Link>
          <p className="text-slate-400 text-[10px] mt-1 uppercase font-bold tracking-widest">
            Cổng bác sĩ
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-teal-600 text-white shadow-lg shadow-teal-600/20"
                    : "hover:bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <span
                  className={
                    isActive ? "text-white" : "group-hover:text-teal-400"
                  }
                >
                  {item.icon}
                </span>
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl">
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold truncate">
                {user?.fullName}
              </span>
              <span className="text-[10px] text-teal-400 font-medium">
                Bác sĩ
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
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm">
          <div>
            <h2 className="text-slate-800 font-bold text-lg leading-none">
              {navItems.find((n) => n.to === location.pathname)?.label ||
                "Tổng quan"}
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Chào, BS. {user?.fullName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-xs border border-teal-200">
              {user?.fullName?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
