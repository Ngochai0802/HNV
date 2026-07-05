import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getNotifications, markAsRead } from "../../api/notification";
import { Bell, Calendar } from "lucide-react";

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    getNotifications()
      .then((r) => setNotifications(r.data))
      .catch(() => {});
  }, []);

  const handleNotificationClick = async (n) => {
    if (!n.isRead) {
      await markAsRead(n.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item)),
      );
    }
    
    let url = n.relatedUrl;
    if (!url) {
      const lowerTitle = n.title.toLowerCase();
      if (lowerTitle.includes("lịch khám")) {
        url = "/admin/appointments";
      } else if (lowerTitle.includes("phân công") || lowerTitle.includes("ảnh")) {
        url = "/admin/images";
      }
    }

    if (url) {
      navigate(url);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (!dateFilter) return true;
    const nDate = new Date(n.createdAt).toISOString().split('T')[0];
    return nDate === dateFilter;
  });

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDateChange = (e) => {
    setDateFilter(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 w-full pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Thông báo hệ thống</h1>
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
          <Calendar size={18} className="text-slate-500" />
          <input 
            type="date" 
            value={dateFilter}
            onChange={handleDateChange}
            className="outline-none text-sm font-medium text-slate-700 bg-transparent cursor-pointer w-full"
          />
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <p className="text-slate-400 text-center py-16">Chưa có thông báo</p>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`group rounded-2xl border p-5 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1
                  ${n.isRead ? "bg-white border-slate-100" : "bg-gradient-to-r from-blue-50/50 to-white border-blue-200"}`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors
                    ${n.isRead ? "bg-slate-50 text-slate-400 group-hover:bg-slate-100" : "bg-blue-100 text-blue-600 group-hover:bg-blue-200"}`}
                  >
                    <Bell size={22} />
                  </div>
                  <div className="flex-1 pt-1">
                    <p
                      className={`font-semibold text-lg ${n.isRead ? "text-slate-600" : "text-slate-800"}`}
                    >
                      {n.title}
                    </p>
                    <p className="text-slate-500 mt-1">{n.content}</p>
                    <p className="text-slate-400 text-sm mt-3 font-medium">
                      {new Date(n.createdAt).toLocaleString("vi-VN", {
                        hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric"
                      })}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0 mt-3 shadow-sm" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 pt-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition"
              >
                Trước
              </button>
              <span className="text-sm font-medium text-slate-500">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition"
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
