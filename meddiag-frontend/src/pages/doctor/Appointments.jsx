import { useEffect, useState, useMemo } from "react";
import { getDoctorAppointments } from "../../api/doctor";
import { Calendar, Search, ChevronLeft, ChevronRight, XCircle, Clock, CalendarCheck } from "lucide-react";

const STATUS = {
  confirmed: { label: "Đã xác nhận", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-700 border-red-200" },
};

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    getDoctorAppointments()
      .then((r) => setAppointments(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Is Today Helper
  const isToday = (dateString) => {
    const today = new Date();
    const date = new Date(dateString);
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Filter Logic
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;

      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        if (!a.patientName?.toLowerCase().includes(query)) return false;
      }

      if (dateFilter) {
        const itemDate = new Date(a.appointmentTime).toISOString().split("T")[0];
        if (itemDate !== dateFilter) return false;
      }

      return true;
    });
  }, [appointments, statusFilter, searchQuery, dateFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Lịch khám của tôi</h1>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Status Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          {[
            { id: "all", label: "Tất cả" },
            { id: "confirmed", label: "Đã xác nhận" },
            { id: "cancelled", label: "Đã hủy" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                statusFilter === tab.id 
                  ? "bg-white text-teal-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Search Box */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex-1 transition focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100">
            <Search size={18} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Tên bệnh nhân..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="outline-none text-sm font-medium text-slate-700 bg-transparent w-full placeholder:text-slate-400"
            />
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 transition focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100 w-full sm:w-auto">
            <Calendar size={18} className="text-slate-400" />
            <input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="outline-none text-sm font-medium text-slate-700 bg-transparent cursor-pointer w-full"
            />
          </div>
        </div>
      </div>

      {/* Appointment List */}
      <div className="space-y-4">
        {paginatedAppointments.map((a) => {
          const s = STATUS[a.status] || {
            label: a.status,
            color: "bg-slate-100 text-slate-600",
          };
          const apptDate = new Date(a.appointmentTime);
          const isApptToday = isToday(a.appointmentTime);

          return (
            <div
              key={a.id}
              className={`bg-white rounded-2xl border transition-all duration-300 hover:shadow-md relative overflow-hidden ${isApptToday ? 'border-teal-400 shadow-teal-500/10 shadow-lg' : 'border-slate-200 shadow-sm'}`}
            >
              {isApptToday && (
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-500"></div>
              )}
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-5 sm:pl-8">
                {/* 1. Calendar Leaf UI */}
                <div className={`w-20 h-24 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 border shadow-inner ${isApptToday ? 'bg-teal-50 border-teal-100' : 'bg-slate-50 border-slate-100'}`}>
                    <span className={`text-xs font-bold uppercase tracking-wider mb-1 ${isApptToday ? 'text-teal-600' : 'text-slate-500'}`}>
                        Tháng {apptDate.getMonth() + 1}
                    </span>
                    <span className={`text-3xl font-black ${isApptToday ? 'text-teal-700' : 'text-slate-700'}`}>
                        {apptDate.getDate()}
                    </span>
                </div>

                {/* 2. Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                      <h2 className="font-bold text-lg text-slate-800 truncate">
                        BN. {a.patientName}
                      </h2>
                      {isApptToday && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full uppercase tracking-wider">Hôm nay</span>
                      )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-slate-500 text-sm mt-2">
                      <p className="flex items-center gap-1.5 font-medium">
                        <Clock size={16} className={isApptToday ? 'text-teal-500' : 'text-slate-400'} />
                        {apptDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                  </div>

                  {a.note && (
                    <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl inline-block w-full max-w-lg">
                      <p className="text-slate-600 text-sm flex items-start gap-2">
                        <span className="font-semibold text-slate-700 flex-shrink-0">Ghi chú:</span> {a.note}
                      </p>
                    </div>
                  )}

                  {a.status === 'cancelled' && a.cancelReason && (
                    <div className="mt-3 p-3 bg-red-50/50 border border-red-100 rounded-xl inline-block w-full max-w-lg">
                      <p className="text-red-600 text-sm flex items-start gap-1.5">
                        <XCircle size={16} className="mt-0.5 flex-shrink-0" />
                        <span><strong>Lý do hủy:</strong> {a.cancelReason}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. Status Badge */}
                <div className="flex items-center gap-3 flex-shrink-0 mt-4 sm:mt-0 justify-end w-full sm:w-auto border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
                  <span
                    className={`text-sm font-bold px-4 py-2 rounded-xl border ${s.color}`}
                  >
                    {s.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {filteredAppointments.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarCheck size={28} className="text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">
              Không tìm thấy lịch khám nào phù hợp
            </p>
            <p className="text-slate-400 text-sm mt-1">Thử thay đổi từ khóa hoặc bộ lọc để xem thêm</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 bg-white px-4 py-3 border border-slate-200 rounded-2xl shadow-sm">
          <p className="text-sm text-slate-500 hidden sm:block">
            Hiển thị <span className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> đến <span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredAppointments.length)}</span> trong số <span className="font-semibold text-slate-700">{filteredAppointments.length}</span> lịch khám
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} /> Trước
            </button>
            <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${currentPage === i + 1 ? 'bg-teal-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
                    >
                        {i + 1}
                    </button>
                ))}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Sau <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
