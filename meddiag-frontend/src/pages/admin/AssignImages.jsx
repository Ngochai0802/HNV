import { useEffect, useState } from "react";
import { getAdminImages, getDoctors, assignImage } from "../../api/admin";
import toast from "react-hot-toast";
import { UserCheck } from "lucide-react";

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

  const load = () =>
    Promise.all([getAdminImages(), getDoctors()])
      .then(([imgRes, docRes]) => {
        setImages(imgRes.data);
        setDoctors(docRes.data);
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

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">
        Phân công ảnh cho bác sĩ
      </h1>
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
