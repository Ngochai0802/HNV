import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyImages } from "../../api/patient";
import { Clock, CheckCircle, AlertCircle, Eye, FileX2, Brain, ChevronLeft, ChevronRight, Activity } from "lucide-react";

const STATUS_CONFIG = {
  pending: { label: "Chờ xử lý", color: "bg-yellow-100 text-yellow-700" },
  processed: { label: "Chờ xử lý", color: "bg-yellow-100 text-yellow-700" },
  assigned: { label: "Đã phân công", color: "bg-blue-100 text-blue-700" },
  diagnosed: { label: "Đã chẩn đoán", color: "bg-green-100 text-green-700" },
};

export default function ImageList() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    getMyImages()
      .then((res) => setImages(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const filteredImages = images.filter((img) => {
    // Lọc theo trạng thái / AI
    if (filter === "pending" && img.hasDiagnosis) return false;
    if (filter === "diagnosed" && !img.hasDiagnosis) return false;
    if (filter === "danger" && (!img.aiResult || img.aiResult.toLowerCase().includes("normal") || img.aiResult.toLowerCase().includes("bình thường"))) return false;

    // Lọc theo thời gian
    if (timeFilter !== "all") {
      const imgDate = new Date(img.uploadDate);
      const now = new Date();
      if (timeFilter === "7days") {
        const diff = now - imgDate;
        if (diff > 7 * 24 * 60 * 60 * 1000) return false;
      } else if (timeFilter === "30days") {
        const diff = now - imgDate;
        if (diff > 30 * 24 * 60 * 60 * 1000) return false;
      } else if (timeFilter === "today") {
        if (imgDate.getDate() !== now.getDate() || imgDate.getMonth() !== now.getMonth() || imgDate.getFullYear() !== now.getFullYear()) return false;
      }
    }
    return true;
  });

  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);
  const paginatedImages = filteredImages.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (images.length === 0)
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileX2 size={28} className="text-slate-400" />
        </div>
        <p className="text-slate-500 text-lg font-medium">
          Bạn chưa upload ảnh nào
        </p>
        <p className="text-slate-400 text-sm mt-1">
          Upload ảnh X-quang để bắt đầu chẩn đoán
        </p>
        <Link
          to="/patient/upload"
          className="mt-5 inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition"
        >
          Upload ngay
        </Link>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">
          Lịch sử chẩn đoán
        </h1>
        <Link
          to="/patient/upload"
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition"
        >
          + Upload mới
        </Link>
      </div>

      {/* FILTER TABS & TIME FILTER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
          {[
            { id: "all", label: "Tất cả" },
            { id: "pending", label: "Đang chờ phân tích" },
            { id: "diagnosed", label: "Đã có chẩn đoán" },
            { id: "danger", label: "⚠️ Cảnh báo AI" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                filter === f.id
                  ? "bg-slate-800 text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        
        <select
          value={timeFilter}
          onChange={(e) => { setTimeFilter(e.target.value); setPage(1); }}
          className="bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-2 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
        >
          <option value="all">Mọi lúc</option>
          <option value="today">Hôm nay</option>
          <option value="7days">7 ngày qua</option>
          <option value="30days">30 ngày qua</option>
        </select>
      </div>

      <div className="grid gap-4">
        {paginatedImages.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-slate-500 font-medium">Không có kết quả nào phù hợp với bộ lọc.</p>
          </div>
        ) : paginatedImages.map((img) => {
          const s = STATUS_CONFIG[img.status] || {
            label: img.status,
            color: "bg-slate-100 text-slate-600",
          };
          const imgUrl = img.imageUrl
            ? `http://localhost:5255${img.imageUrl}`
            : null;

          return (
            <div
              key={img.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-5 hover:shadow-md transition-all duration-300"
            >
              {/* Thumbnail ảnh với fallback */}
              <div className="w-20 h-20 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden">
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={img.fileName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Khi ảnh lỗi, thay bằng icon placeholder
                      e.target.style.display = "none";
                      e.target.parentElement.classList.add(
                        "flex",
                        "items-center",
                        "justify-center",
                      );
                      const icon = document.createElement("div");
                      icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
                      e.target.parentElement.appendChild(icon);
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileX2 size={28} className="text-slate-400" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                    <Activity size={16} className="text-blue-500" />
                    Hồ sơ X-quang Phổi
                  </h3>
                  {img.aiResult && !img.aiResult.toLowerCase().includes("normal") && !img.aiResult.toLowerCase().includes("bình thường") && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Cảnh báo bất thường" />
                  )}
                </div>
                
                <p className="text-slate-400 text-xs truncate">
                  Tệp: {img.fileName} • Cập nhật: {new Date(img.uploadDate).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })}
                </p>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {/* Trạng thái Bác sĩ */}
                  {img.hasDiagnosis ? (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle size={12} /> Bác sĩ đã chẩn đoán
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                      <Clock size={12} /> Bác sĩ đang xem xét
                    </span>
                  )}
                  
                  {/* Trạng thái AI */}
                  {img.aiResult && (
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border flex items-center gap-1 ${
                      img.aiResult.toLowerCase().includes("normal") || img.aiResult.toLowerCase().includes("bình thường")
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}>
                      <Brain size={12} /> AI: {img.aiResult}
                    </span>
                  )}
                </div>
              </div>

              <Link
                to={`/patient/images/${img.id}`}
                className="flex items-center gap-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex-shrink-0"
              >
                <Eye size={16} /> Xem
              </Link>
            </div>
          );
        })}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white shadow-sm transition"
          >
            <ChevronLeft size={18} />
          </button>
          
          <div className="flex items-center gap-1.5">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-10 h-10 rounded-xl font-bold text-sm transition-all shadow-sm ${
                  page === i + 1
                    ? "bg-blue-600 text-white border border-blue-600"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white shadow-sm transition"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
