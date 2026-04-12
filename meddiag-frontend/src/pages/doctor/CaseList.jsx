import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAssignments } from "../../api/doctor";
import { Eye, Filter, FileX2, ClipboardList } from "lucide-react";

const STATUS_CONFIG = {
  pending: { label: "Chờ xử lý", color: "bg-yellow-100 text-yellow-700" },
  in_progress: { label: "Đang xử lý", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Hoàn thành", color: "bg-green-100 text-green-700" },
};

export default function CaseList() {
  const [cases, setCases] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAssignments(filter || undefined)
      .then((res) => setCases(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">
          Danh sách ca bệnh
        </h1>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Tất cả</option>
            <option value="pending">Chờ xử lý</option>
            <option value="in_progress">Đang xử lý</option>
            <option value="completed">Hoàn thành</option>
          </select>
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList size={28} className="text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">Không có ca nào</p>
          <p className="text-slate-400 text-sm mt-1">
            Thử thay đổi bộ lọc để xem thêm
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {cases.map((a) => {
            const s = STATUS_CONFIG[a.status] || {
              label: a.status,
              color: "bg-slate-100 text-slate-600",
            };
            const imgUrl = a.image?.imageUrl
              ? `http://localhost:5255${a.image.imageUrl}`
              : null;

            return (
              <div
                key={a.assignmentId}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-5 hover:shadow-md transition-all duration-300"
              >
                {/* Thumbnail ảnh với fallback */}
                <div className="w-20 h-20 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={a.image.fileName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
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
                  <p className="font-bold text-slate-800 truncate">
                    {a.image.fileName}
                  </p>
                  <p className="text-slate-500 text-sm mt-1">
                    Bệnh nhân: {a.image.patientName}
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    Phân công:{" "}
                    {new Date(a.assignedAt).toLocaleString("vi-VN")}
                  </p>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg mt-2 inline-block ${s.color}`}
                  >
                    {s.label}
                  </span>
                </div>

                <Link
                  to={`/doctor/cases/${a.image.id}`}
                  className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-700 transition-all flex-shrink-0 shadow-sm shadow-teal-600/20"
                >
                  <Eye size={16} /> Xem & Chẩn đoán
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
