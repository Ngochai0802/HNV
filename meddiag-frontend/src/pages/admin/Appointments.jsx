import { useEffect, useState } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { Calendar, CheckCircle } from "lucide-react";

const STATUS = {
  pending: { label: "Chờ duyệt", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Đã xác nhận", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-700" },
};

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api
      .get("/admin/appointments")
      .then((r) => setAppointments(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (id) => {
    try {
      await api.patch(`/admin/appointments/${id}/approve`);
      toast.success("Đã xác nhận lịch khám — bác sĩ đã được thông báo!");
      load();
    } catch {
      toast.error("Thao tác thất bại");
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
      <h1 className="text-2xl font-bold text-slate-800">Quản lý lịch khám</h1>
      <div className="grid gap-4">
        {appointments.map((a) => {
          const s = STATUS[a.status] || {
            label: a.status,
            color: "bg-slate-100 text-slate-600",
          };
          return (
            <div
              key={a.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-5"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                <Calendar size={22} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800">
                  {a.patientName} → BS. {a.doctorName}
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  {new Date(a.appointmentTime).toLocaleString("vi-VN")}
                </p>
                {a.note && (
                  <p className="text-slate-400 text-xs mt-1">{a.note}</p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg ${s.color}`}
                >
                  {s.label}
                </span>
                {a.status === "pending" && (
                  <button
                    onClick={() => handleApprove(a.id)}
                    className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-700 transition"
                  >
                    <CheckCircle size={16} /> Duyệt
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {appointments.length === 0 && (
          <p className="text-center text-slate-400 py-16">
            Chưa có lịch khám nào
          </p>
        )}
      </div>
    </div>
  );
}
