import { useEffect, useState } from "react";
import { getUsers } from "../../api/admin";
import { Users, UserCheck, Image, Bell } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    doctors: 0,
    patients: 0,
  });

  useEffect(() => {
    getUsers()
      .then((res) => {
        const users = res.data;
        setStats({
          total: users.length,
          active: users.filter((u) => u.isActive).length,
          doctors: users.filter((u) => u.role === "doctor").length,
          patients: users.filter((u) => u.role === "patient").length,
        });
      })
      .catch(() => {});
  }, []);

  const cards = [
    {
      label: "Tổng người dùng",
      value: stats.total,
      icon: <Users size={22} />,
      color: "bg-blue-500",
    },
    {
      label: "Đang hoạt động",
      value: stats.active,
      icon: <UserCheck size={22} />,
      color: "bg-green-500",
    },
    {
      label: "Bác sĩ",
      value: stats.doctors,
      icon: <Image size={22} />,
      color: "bg-purple-500",
    },
    {
      label: "Bệnh nhân",
      value: stats.patients,
      icon: <Bell size={22} />,
      color: "bg-yellow-500",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Tổng quan hệ thống</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
          >
            <div
              className={`w-10 h-10 ${c.color} rounded-xl flex items-center justify-center text-white mb-3`}
            >
              {c.icon}
            </div>
            <p className="text-2xl font-bold text-slate-800">{c.value}</p>
            <p className="text-slate-500 text-sm mt-1">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
