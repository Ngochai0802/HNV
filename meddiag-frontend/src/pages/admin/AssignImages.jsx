import { useEffect, useState } from "react";
import {
  getAdminImages,
  getDoctors,
  assignImage,
  autoAssignImages,
  getAutoAssignStatus,
  toggleAutoAssign,
} from "../../api/admin";
import toast from "react-hot-toast";
import { UserCheck, Zap } from "lucide-react";

const STATUS_COLOR = {
  pending: "bg-yellow-100 text-yellow-700",
  assigned: "bg-blue-100 text-blue-700",
  diagnosed: "bg-green-100 text-green-700",
};

export default function AssignImages() {
  const [images, setImages] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({});
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [toggling, setToggling] = useState(false);

  const load = () =>
    Promise.all([getAdminImages(), getDoctors(), getAutoAssignStatus()])
      .then(([imgRes, docRes, statusRes]) => {
        setImages(imgRes.data);
        setDoctors(docRes.data);
        setAutoEnabled(statusRes.data.isEnabled);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const handleAssign = async (imageId) => {
    const doctorId = selected[imageId];
    if (!doctorId) {
      toast.error("Vui lòng chọn bác sĩ");
      return;
    }
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
    } catch (err) {
      toast.error("Không thể thay đổi chế độ");
    } finally {
      setToggling(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">
          Phân công ảnh cho bác sĩ
        </h1>

        {/* Toggle tự động phân công */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-700">
              Tự động phân công
            </p>
            <p className="text-xs text-slate-400">
              {autoEnabled
                ? "Ảnh mới sẽ tự động gán cho bác sĩ"
                : "Admin phân công thủ công"}
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

      <div className="grid gap-4">
        {images.map((img) => {
          const sc = STATUS_COLOR[img.status] || "bg-slate-100 text-slate-600";
          return (
            <div
              key={img.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-5"
            >
              <img
                src={`http://localhost:5255${img.imageUrl}`}
                alt={img.fileName}
                className="w-16 h-16 object-cover rounded-xl bg-slate-100 flex-shrink-0"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 truncate">
                  {img.fileName}
                </p>
                <p className="text-slate-500 text-sm">
                  Bệnh nhân: {img.patientName}
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  {new Date(img.uploadDate).toLocaleString("vi-VN")}
                </p>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-lg mt-2 inline-block ${sc}`}
                >
                  {img.status}
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
                <span className="text-sm font-bold text-green-600 flex-shrink-0">
                  ✓ Đã phân công
                </span>
              )}
            </div>
          );
        })}
        {images.length === 0 && (
          <p className="text-center text-slate-400 py-16">
            Không có ảnh nào cần phân công
          </p>
        )}
      </div>
    </div>
  );
}
