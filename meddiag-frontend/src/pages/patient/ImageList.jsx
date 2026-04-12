import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyImages } from "../../api/patient";
import { Clock, CheckCircle, AlertCircle, Eye, FileX2 } from "lucide-react";

const STATUS_CONFIG = {
  pending: { label: "Chờ xử lý", color: "bg-yellow-100 text-yellow-700" },
  assigned: { label: "Đã phân công", color: "bg-blue-100 text-blue-700" },
  diagnosed: { label: "Đã chẩn đoán", color: "bg-green-100 text-green-700" },
};

export default function ImageList() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

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

      <div className="grid gap-4">
        {images.map((img) => {
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
                <p className="font-bold text-slate-800 truncate">
                  {img.fileName}
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  {new Date(img.uploadDate).toLocaleString("vi-VN")}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg ${s.color}`}
                  >
                    {s.label}
                  </span>
                  {img.hasDiagnosis && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-green-100 text-green-700 flex items-center gap-1">
                      <CheckCircle size={12} /> Có chẩn đoán
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
    </div>
  );
}
