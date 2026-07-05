import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { getAssignments } from "../../api/doctor";
import { Eye, Search, FileX2, ClipboardList, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";

const STATUS_CONFIG = {
  pending: { label: "Chờ xử lý", color: "bg-amber-100 text-amber-700 border-amber-200" },
  completed: { label: "Hoàn thành", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

export default function CaseList() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setLoading(true);
    getAssignments()
      .then((res) => setCases(res.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Filter and Sort Logic
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // 1. Status Filter
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      
      // 2. Search Query (Patient Name or File Name)
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const patientName = c.image?.patientName?.toLowerCase() || "";
        const fileName = c.image?.fileName?.toLowerCase() || "";
        if (!patientName.includes(query) && !fileName.includes(query)) return false;
      }
      
      return true;
    }).sort((a, b) => {
        // Nếu cùng ở trạng thái chờ xử lý, ưu tiên ca nguy hiểm lên đầu
        if (a.status === "pending" && b.status === "pending") {
            const aDanger = (a.image?.aiResult?.severityLevel === "Nguy hiểm" || a.image?.aiResult?.severityLevel === "danger") ? 1 : 0;
            const bDanger = (b.image?.aiResult?.severityLevel === "Nguy hiểm" || b.image?.aiResult?.severityLevel === "danger") ? 1 : 0;
            if (aDanger !== bDanger) return bDanger - aDanger;
        }
        return 0; // Giữ nguyên thứ tự mới nhất từ API
    });
  }, [cases, statusFilter, searchQuery]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredCases.length / itemsPerPage);
  const paginatedCases = filteredCases.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Đảm bảo không bị lọt trang trống khi filter
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
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Danh sách ca bệnh</h1>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm bệnh nhân, mã ảnh..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all ${statusFilter === "all" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all ${statusFilter === "pending" ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Chờ xử lý
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all ${statusFilter === "completed" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Hoàn thành
            </button>
          </div>
        </div>
      </div>

      {/* Case List */}
      {paginatedCases.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-slate-100 border-dashed">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList size={28} className="text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">Không tìm thấy ca bệnh nào</p>
          <p className="text-slate-400 text-sm mt-1">Thử thay đổi từ khóa hoặc bộ lọc để xem thêm</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {paginatedCases.map((a, index) => {
            const s = STATUS_CONFIG[a.status] || { label: a.status, color: "bg-slate-100 text-slate-600" };
            const imgUrl = a.image?.imageUrl ? `http://localhost:5255${a.image.imageUrl}` : null;
            const aiResult = a.image?.aiResult;
            
            // Determine severity theme
            let severityTheme = {
                badgeBg: 'bg-slate-50 border-slate-200',
                badgeText: 'text-slate-600',
                icon: <CheckCircle2 size={14} className="text-slate-500" />,
                btnClass: 'bg-slate-600 text-white hover:bg-slate-700 shadow-slate-600/20'
            };

            if (aiResult) {
                if (aiResult.severityLevel === "Nguy hiểm" || aiResult.severityLevel === "danger") {
                    severityTheme = {
                        badgeBg: 'bg-red-50/80 border-red-200',
                        badgeText: 'text-red-700',
                        subText: 'text-red-500',
                        icon: <AlertTriangle size={14} className="text-red-600" />,
                        btnClass: 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/20'
                    };
                } else if (aiResult.severityLevel === "Cần khám ngay" || aiResult.severityLevel === "warning") {
                    severityTheme = {
                        badgeBg: 'bg-amber-50/80 border-amber-200',
                        badgeText: 'text-amber-700',
                        subText: 'text-amber-600',
                        icon: <AlertTriangle size={14} className="text-amber-500" />,
                        btnClass: 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20'
                    };
                } else {
                    severityTheme = {
                        badgeBg: 'bg-emerald-50/80 border-emerald-200',
                        badgeText: 'text-emerald-700',
                        subText: 'text-emerald-600',
                        icon: <CheckCircle2 size={14} className="text-emerald-600" />,
                        btnClass: 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/20'
                    };
                }
            }

            return (
              <div
                key={a.assignmentId}
                className={`p-4 flex flex-col sm:flex-row sm:items-center gap-5 transition-colors ${index !== paginatedCases.length - 1 ? 'border-b border-slate-100' : ''} hover:bg-slate-50`}
              >
                {/* 1. Thumbnail */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200 relative">
                  {imgUrl ? (
                    <img src={imgUrl} alt={a.image.fileName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><FileX2 size={24} className="text-slate-400" /></div>
                  )}
                  {/* Status indicator pip */}
                  <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full border-2 border-white ${a.status === 'pending' ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
                </div>

                {/* 2. Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-800 text-base truncate">{a.image?.patientName}</h3>
                    <span className="text-xs font-medium text-slate-400 px-2 py-0.5 bg-slate-100 rounded-md">{a.image?.fileName}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-500 mt-2">
                    <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${s.color}`}>
                            {s.label}
                        </span>
                    </div>
                    <span className="hidden sm:inline-block text-slate-300">•</span>
                    <span className="text-xs">Phân công: {new Date(a.assignedAt).toLocaleString("vi-VN", { hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit', year:'numeric' })}</span>
                  </div>
                </div>

                {/* 3. AI Prediction Badge */}
                <div className="flex-shrink-0 sm:w-56">
                    {aiResult ? (
                        <div className={`flex flex-col justify-center px-3 py-2 rounded-xl border ${severityTheme.badgeBg}`}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                                {severityTheme.icon}
                                <span className={`text-sm font-bold ${severityTheme.badgeText}`}>
                                    {aiResult.predictionLabel}
                                </span>
                            </div>
                            <span className={`text-xs font-medium ${severityTheme.subText}`}>
                                Tin cậy: {(aiResult.confidenceScore * 100).toFixed(1)}% • {aiResult.severityLevel}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-slate-400 text-sm px-3 py-2 border border-dashed border-slate-200 rounded-xl">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            <span className="text-xs font-medium">Chưa có kết quả AI</span>
                        </div>
                    )}
                </div>

                {/* 4. Actions */}
                <div className="flex-shrink-0 flex items-center justify-end">
                  <Link
                    to={`/doctor/cases/${a.image?.id}`}
                    className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
                        a.status === 'completed' 
                            ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50' 
                            : severityTheme.btnClass
                    }`}
                  >
                    <Eye size={16} /> 
                    {a.status === 'completed' ? 'Xem kết quả' : 'Chẩn đoán ngay'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 bg-white px-4 py-3 border border-slate-200 rounded-2xl shadow-sm">
          <p className="text-sm text-slate-500 hidden sm:block">
            Hiển thị <span className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> đến <span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredCases.length)}</span> trong số <span className="font-semibold text-slate-700">{filteredCases.length}</span> ca bệnh
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
