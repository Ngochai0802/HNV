import { useEffect, useState, useMemo } from "react";
import {
  getAdminImages,
  getDoctors,
  assignImage,
  autoAssignImages,
  getAutoAssignStatus,
  toggleAutoAssign,
} from "../../api/admin";
import toast from "react-hot-toast";
import {
  UserCheck,
  Zap,
  Search,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
} from "lucide-react";

// ─── Hằng số ──────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

const STATUS_TABS = [
  { key: "all",      label: "Tất cả" },
  { key: "pending",  label: "⏳ Chờ phân công" },
  { key: "assigned", label: "📋 Đã phân công" },
  { key: "diagnosed",label: "✅ Đã chẩn đoán" },
];

const STATUS_COLOR = {
  pending:  "bg-yellow-100 text-yellow-700",
  assigned: "bg-blue-100 text-blue-700",
  diagnosed:"bg-green-100 text-green-700",
};

const STATUS_LABEL = {
  pending:  "Chờ phân công",
  processed:"Chờ phân công (Đã qua AI)",
  assigned: "Đã phân công",
  diagnosed:"Đã chẩn đoán",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AssignImages() {
  // Server data
  const [images,     setImages]      = useState([]);
  const [doctors,    setDoctors]     = useState([]);
  const [loading,    setLoading]     = useState(true);
  const [selected,   setSelected]    = useState({});
  const [autoEnabled,setAutoEnabled] = useState(false);
  const [toggling,   setToggling]    = useState(false);

  // Filter state
  const [search,    setSearch]    = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");
  const [filterDoctorId, setFilterDoctorId] = useState("");

  // Pagination
  const [page, setPage] = useState(1);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const load = () =>
    Promise.all([getAdminImages(), getDoctors(), getAutoAssignStatus()])
      .then(([imgRes, docRes, statusRes]) => {
        setImages(imgRes.data);
        setDoctors(docRes.data);
        setAutoEnabled(statusRes.data.isEnabled);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleAssign = async (imageId) => {
    const doctorId = selected[imageId];
    if (!doctorId) { toast.error("Vui lòng chọn bác sĩ"); return; }
    try {
      await assignImage(imageId, Number(doctorId));
      toast.success("Phân công thành công!");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Phân công thất bại");
    }
  };

  const handleToggleAuto = async () => {
    setToggling(true);
    try {
      const res = await toggleAutoAssign();
      setAutoEnabled(res.data.isEnabled);
      toast.success(res.data.message);

      // Nếu vừa BẬT tự động, gọi API để xử lý luôn ảnh tồn đọng
      if (res.data.isEnabled) {
        const autoRes = await autoAssignImages();
        if (autoRes.data.assignedCount > 0) {
          toast.success(`Đã tự động phân công ${autoRes.data.assignedCount} ảnh tồn đọng!`);
          load(); // Load lại danh sách ảnh mới
        }
      }
    } catch {
      toast.error("Không thể thay đổi chế độ");
    } finally {
      setToggling(false);
    }
  };

  // ── Filter logic ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return images.filter((img) => {
      // 1. Tìm kiếm tên bệnh nhân
      if (
        search.trim() &&
        !img.patientName?.toLowerCase().includes(search.trim().toLowerCase())
      )
        return false;

      // 2. Lọc trạng thái
      if (statusTab === "pending" && img.isAssigned) return false;
      if (statusTab === "pending" && (img.status !== "pending" && img.status !== "processed")) return false;
      if (statusTab !== "all" && statusTab !== "pending" && img.status !== statusTab) return false;

      // 3. Lọc ngày
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (new Date(img.uploadDate) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(img.uploadDate) > to) return false;
      }

      // 4. Lọc theo bác sĩ
      if (filterDoctorId && img.assignedDoctorId !== Number(filterDoctorId)) {
        return false;
      }

      return true;
    });
  }, [images, search, statusTab, dateFrom, dateTo, filterDoctorId]);

  // Reset về trang 1 khi bộ lọc thay đổi
  const applyFilter = (fn) => { fn(); setPage(1); };

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage    = Math.min(page, totalPages);
  const paginated   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const hasFilter = search || statusTab !== "all" || dateFrom || dateTo || filterDoctorId;

  const clearFilters = () => {
    setSearch(""); setStatusTab("all"); setDateFrom(""); setDateTo(""); setFilterDoctorId(""); setPage(1);
  };

  // ── Helpers: page range ────────────────────────────────────────────────────
  const pageRange = () => {
    const delta = 2;
    const range = [];
    for (
      let i = Math.max(1, safePage - delta);
      i <= Math.min(totalPages, safePage + delta);
      i++
    ) range.push(i);
    return range;
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Phân công ảnh cho bác sĩ
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Tổng: <span className="font-semibold text-slate-600">{images.length}</span> ảnh •
            Hiển thị: <span className="font-semibold text-slate-600">{filtered.length}</span> kết quả
          </p>
        </div>

        {/* Toggle tự động */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-700">Tự động phân công</p>
            <p className="text-xs text-slate-400">
              {autoEnabled ? "Ảnh mới sẽ tự động gán cho bác sĩ" : "Admin phân công thủ công"}
            </p>
          </div>
          <button
            onClick={handleToggleAuto}
            disabled={toggling}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              autoEnabled
                ? "bg-green-500 focus:ring-green-400"
                : "bg-slate-300 focus:ring-slate-400"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                autoEnabled ? "translate-x-7" : "translate-x-0"
              }`}
            />
          </button>
          {autoEnabled && (
            <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg">
              <Zap size={12} /> ON
            </span>
          )}
        </div>
      </div>

      {/* ── Banner auto ───────────────────────────────────────────────────── */}
      {autoEnabled && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
          <div className="flex items-center gap-2 font-bold mb-1">
            <Zap size={16} /> Chế độ tự động đang BẬT
          </div>
          <p className="text-green-600">
            Khi bệnh nhân upload ảnh mới, hệ thống sẽ tự động phân công cho bác
            sĩ phù hợp nhất theo tiêu chí: chuyên khoa Phổi/X-quang → ít ca
            nhất → lâu chưa nhận ca.
          </p>
        </div>
      )}

      {/* ═══ BỘ LỌC ══════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 space-y-4">
        {/* Hàng 1: Tìm kiếm + Ngày */}
        <div className="flex flex-wrap gap-3 items-end">
          {/* Tìm kiếm tên bệnh nhân */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="search-patient"
              type="text"
              placeholder="Tìm theo tên bệnh nhân..."
              value={search}
              onChange={(e) => applyFilter(() => setSearch(e.target.value))}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Từ ngày */}
          <div className="flex items-center gap-2">
            <CalendarDays size={15} className="text-slate-400 flex-shrink-0" />
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  Từ ngày
                </label>
                <input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => applyFilter(() => setDateFrom(e.target.value))}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
              <span className="text-slate-300 font-light mt-4">→</span>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  Đến ngày
                </label>
                <input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => applyFilter(() => setDateTo(e.target.value))}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>
          </div>

            <div className="flex items-center gap-2">
              <UserCheck size={15} className="text-slate-400 flex-shrink-0" />
              <select
                value={filterDoctorId}
                onChange={(e) => applyFilter(() => setFilterDoctorId(e.target.value))}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition max-w-[200px]"
              >
                <option value="">Tất cả bác sĩ</option>
                {doctors.map((d) => (
                  <option key={d.userId} value={d.userId}>
                    BS. {d.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Nút xoá bộ lọc */}
            {hasFilter && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-500 border border-slate-200 hover:border-red-300 bg-white px-3 py-2.5 rounded-xl transition-all"
              >
                <X size={13} /> Xoá bộ lọc
              </button>
            )}
        </div>

        {/* Hàng 2: Tab trạng thái */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.key === "all"
                ? images.length
                : tab.key === "pending"
                ? images.filter((img) => !img.isAssigned && (img.status === "pending" || img.status === "processed")).length
                : images.filter((img) => img.status === tab.key).length;
            const isActive = statusTab === tab.key;
            return (
              <button
                key={tab.key}
                id={`tab-status-${tab.key}`}
                onClick={() => applyFilter(() => setStatusTab(tab.key))}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                  isActive
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200"
                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                {tab.label}
                <span
                  className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? "bg-blue-500 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ DANH SÁCH ẢNH ═══════════════════════════════════════════════════ */}
      <div className="grid gap-4">
        {paginated.map((img) => {
          const sc = STATUS_COLOR[img.status] || "bg-slate-100 text-slate-600";
          return (
            <div
              key={img.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-5 hover:shadow-md transition-shadow"
            >
              <img
                src={`http://localhost:5255${img.imageUrl}`}
                alt={img.fileName}
                className="w-16 h-16 object-cover rounded-xl bg-slate-100 flex-shrink-0"
                onError={(e) => { e.target.style.display = "none"; }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 truncate">{img.fileName}</p>
                <p className="text-slate-500 text-sm">
                  Bệnh nhân:{" "}
                  <span className="font-semibold text-slate-700">
                    {img.patientName}
                  </span>
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  {new Date(img.uploadDate).toLocaleString("vi-VN")}
                </p>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg mt-2 inline-block ${sc}`}>
                  {STATUS_LABEL[img.status] || img.status}
                </span>
              </div>

              {!img.isAssigned ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={selected[img.id] || ""}
                    onChange={(e) =>
                      setSelected({ ...selected, [img.id]: e.target.value })
                    }
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Chọn bác sĩ</option>
                    {doctors.map((d) => (
                      <option key={d.userId} value={d.userId}>
                        {d.fullName} ({d.assignedCount} ca)
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAssign(img.id)}
                    className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition"
                  >
                    <UserCheck size={16} /> Phân công
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-sm font-bold text-green-600">
                    ✓ Đã phân công
                  </span>
                  {img.assignedDoctorName && (
                    <span className="text-xs text-slate-500 font-medium mt-1">
                      BS. {img.assignedDoctorName}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Trống */}
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-slate-500 font-semibold">Không tìm thấy kết quả nào</p>
            <p className="text-slate-400 text-sm mt-1">
              Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm
            </p>
            {hasFilter && (
              <button
                onClick={clearFilters}
                className="mt-4 text-sm text-blue-600 hover:underline font-semibold"
              >
                Xoá tất cả bộ lọc
              </button>
            )}
          </div>
        )}
      </div>

      {/* ═══ PHÂN TRANG ══════════════════════════════════════════════════════ */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Info */}
          <p className="text-sm text-slate-500">
            Trang <span className="font-bold text-slate-700">{safePage}</span> /{" "}
            <span className="font-bold text-slate-700">{totalPages}</span> •{" "}
            Hiện{" "}
            <span className="font-bold text-slate-700">
              {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filtered.length)}
            </span>{" "}
            trong{" "}
            <span className="font-bold text-slate-700">{filtered.length}</span>{" "}
            kết quả
          </p>

          {/* Buttons */}
          <div className="flex items-center gap-1">
            {/* Trước */}
            <button
              id="page-prev"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Trang đầu + dấu ... */}
            {pageRange()[0] > 1 && (
              <>
                <button
                  onClick={() => setPage(1)}
                  className="w-9 h-9 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  1
                </button>
                {pageRange()[0] > 2 && (
                  <span className="px-1 text-slate-400 text-sm">…</span>
                )}
              </>
            )}

            {/* Range trang */}
            {pageRange().map((p) => (
              <button
                key={p}
                id={`page-btn-${p}`}
                onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-xl border text-sm font-semibold transition ${
                  p === safePage
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-200"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            ))}

            {/* Dấu ... + trang cuối */}
            {pageRange()[pageRange().length - 1] < totalPages && (
              <>
                {pageRange()[pageRange().length - 1] < totalPages - 1 && (
                  <span className="px-1 text-slate-400 text-sm">…</span>
                )}
                <button
                  onClick={() => setPage(totalPages)}
                  className="w-9 h-9 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  {totalPages}
                </button>
              </>
            )}

            {/* Sau */}
            <button
              id="page-next"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
