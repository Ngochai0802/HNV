import { useEffect, useState } from "react";
import { getNotifications, markAsRead } from "../../api/notification";
import { Bell } from "lucide-react";

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    getNotifications()
      .then((r) => setNotifications(r.data))
      .catch(() => {});
  }, []);

  const handleRead = async (id) => {
    await markAsRead(id).catch(() => {});
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800">Thông báo hệ thống</h1>
      {notifications.length === 0 ? (
        <p className="text-slate-400 text-center py-16">Chưa có thông báo</p>
      ) : (
        notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => !n.isRead && handleRead(n.id)}
            className={`bg-white rounded-2xl border p-5 cursor-pointer transition hover:shadow-md
              ${n.isRead ? "border-slate-100" : "border-blue-200 bg-blue-50"}`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                ${n.isRead ? "bg-slate-100 text-slate-400" : "bg-blue-100 text-blue-600"}`}
              >
                <Bell size={18} />
              </div>
              <div className="flex-1">
                <p
                  className={`font-bold ${n.isRead ? "text-slate-600" : "text-slate-800"}`}
                >
                  {n.title}
                </p>
                <p className="text-slate-500 text-sm mt-1">{n.content}</p>
                <p className="text-slate-400 text-xs mt-2">
                  {new Date(n.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
              {!n.isRead && (
                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
