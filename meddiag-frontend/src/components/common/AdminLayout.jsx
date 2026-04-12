import { Link, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Image,
  Bell,
  LogOut,
  Calendar,
} from "lucide-react";
import useAuthStore from "../../store/useAuthStore";

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-blue-900 text-white flex flex-col">
        <div className="p-6 border-b border-blue-800">
          <h1 className="text-xl font-bold">🏥 MedDiag</h1>
          <p className="text-blue-300 text-sm mt-1">Admin Panel</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link
            to="/admin"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-800 transition"
          >
            <LayoutDashboard size={18} /> Dashboard
          </Link>
          <Link
            to="/admin/users"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-800 transition"
          >
            <Users size={18} /> Quản lý User
          </Link>
          <Link
            to="/admin/images"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-800 transition"
          >
            <Image size={18} /> Phân công ảnh
          </Link>

          {/* ✅ THÊM NGAY ĐÂY */}
          <Link
            to="/admin/appointments"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-800 transition"
          >
            <Calendar size={18} /> Lịch khám
          </Link>

          <Link
            to="/admin/notifications"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-800 transition"
          >
            <Bell size={18} /> Thông báo
          </Link>
        </nav>
        <div className="p-4 border-t border-blue-800">
          <p className="text-sm text-blue-300 mb-2">{user?.fullName}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-300 hover:text-red-100 transition"
          >
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
