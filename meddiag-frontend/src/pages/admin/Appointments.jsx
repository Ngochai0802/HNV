import { useEffect, useState } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { Calendar, CheckCircle, XCircle, Search, X } from "lucide-react";

const STATUS = {
  pending: { label: "Chờ duyệt", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Đã xác nhận", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-700" },
};

const ITEMS_PER_PAGE = 10;

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters and Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "pending", "confirmed", "cancelled"
  const [currentPage, setCurrentPage] = useState(1);

  // Reject Modal State
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const load = () =>
    api
      .get("/admin/appointments")
      .then((r) => setAppointments(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  // Filter Logic
  const filteredAppointments = appointments.filter((a) => {
    // 1. Status Filter
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    
    // 2. Date Filter
    if (dateFilter) {
      const aDate = new Date(a.appointmentTime).toISOString().split('T')[0];
      if (aDate !== dateFilter) return false;
    }

    // 3. Search Query Filter (Search by Patient or Doctor Name)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchPatient = a.patientName?.toLowerCase().includes(query);
      const matchDoctor = a.doctorName?.toLowerCase().includes(query);
      if (!matchPatient && !matchDoctor) return false;
    }

    return true;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredAppointments.length / ITEMS_PER_PAGE);
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFilter, statusFilter]);

  const handleApprove = async (id) => {
    try {
      await api.patch(`/admin/appointments/${id}/approve`);
      toast.success("Đã xác nhận lịch khám — bác sĩ đã được thông báo!");
      load();
    } catch {
      toast.error("Thao tác thất bại");
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    
    setIsRejecting(true);
    try {
      await api.patch(`/admin/appointments/${rejectingId}/reject`, {
        reason: rejectReason.trim()
      });
      toast.success("Đã từ chối lịch khám — bệnh nhân đã được thông báo!");
      setRejectingId(null);
      setRejectReason("");
      load();
    } catch {
      toast.error("Thao tác thất bại");
    } finally {
      setIsRejecting(false);
    }
  };

  const openRejectModal = (id) => {
    setRejectingId(id);
    setRejectReason("");
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6 w-full pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Quản lý lịch khám</h1>
      </div>

      {/* Toolbar: Tabs & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        
        {/* Status Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {[
            { id: "all", label: "Tất cả" },
            { id: "pending", label: "Chờ duyệt" },
            { id: "confirmed", label: "Đã xác nhận" },
            { id: "cancelled", label: "Đã hủy" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                statusFilter === tab.id 
                  ? "bg-white text-blue-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search Box */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex-1 md:w-64 transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
            <Search size={18} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Tên bệnh nhân, bác sĩ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="outline-none text-sm font-medium text-slate-700 bg-transparent w-full placeholder:text-slate-400"
            />
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
            <Calendar size={18} className="text-slate-400" />
            <input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="outline-none text-sm font-medium text-slate-700 bg-transparent cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {paginatedAppointments.map((a) => {
          const s = STATUS[a.status] || {
            label: a.status,
            color: "bg-slate-100 text-slate-600",
          };
          return (
            <div
              key={a.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 transition-all duration-300 hover:shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0
                  ${a.status === 'cancelled' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}
                >
                  <Calendar size={22} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg text-slate-800">
                    {a.patientName} <span className="text-slate-400 font-normal mx-1">→</span> BS. {a.doctorName}
                  </p>
                  <p className="text-slate-500 font-medium mt-1">
                    {new Date(a.appointmentTime).toLocaleString("vi-VN", {
                      hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric"
                    })}
                  </p>
                  {a.note && (
                    <p className="text-slate-500 text-sm mt-2 flex items-start gap-2">
                      <span className="font-semibold text-slate-600">Ghi chú:</span> {a.note}
                    </p>
                  )}
                  {a.status === 'cancelled' && a.cancelReason && (
                    <div className="mt-3 p-3 bg-red-50/50 border border-red-100 rounded-xl inline-block">
                      <p className="text-red-600 text-sm flex items-start gap-1.5">
                        <XCircle size={16} className="mt-0.5 flex-shrink-0" />
                        <span><strong>Lý do từ chối:</strong> {a.cancelReason}</span>
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 mt-4 sm:mt-0">
                  <span
                    className={`text-sm font-bold px-3 py-1.5 rounded-lg ${s.color}`}
                  >
                    {s.label}
                  </span>
                  {a.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openRejectModal(a.id)}
                        className="flex items-center justify-center gap-1.5 bg-white text-red-600 border border-red-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-50 transition"
                      >
                        <XCircle size={16} /> Từ chối
                      </button>
                      <button
                        onClick={() => handleApprove(a.id)}
                        className="flex items-center justify-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-700 shadow-sm transition"
                      >
                        <CheckCircle size={16} /> Duyệt
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filteredAppointments.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 border-dashed">
            <p className="text-slate-400 font-medium">
              Không tìm thấy lịch khám nào phù hợp
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 pt-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition"
          >
            Trước
          </button>
          <span className="text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
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

      {/* Reject Modal Overlay */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-lg">Từ chối lịch khám</h3>
              <button 
                onClick={() => setRejectingId(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleReject} className="p-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Lý do từ chối (bắt buộc)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="VD: Bác sĩ bận đột xuất, lịch kín..."
                className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition resize-none h-24"
                required
                autoFocus
              />
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isRejecting || !rejectReason.trim()}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 shadow-sm transition flex items-center gap-2"
                >
                  {isRejecting ? "Đang xử lý..." : "Xác nhận từ chối"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
