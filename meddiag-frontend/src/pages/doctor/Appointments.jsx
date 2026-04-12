import { useEffect, useState } from "react";
import { getDoctorAppointments } from "../../api/doctor";
import { Calendar } from "lucide-react";

const STATUS = {
  pending: { label: "Chờ duyệt", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Đã xác nhận", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-700" },
};

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDoctorAppointments()
      .then((r) => setAppointments(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800">Lịch khám của tôi</h1>
      {appointments.length === 0 ? (
        <p className="text-center text-slate-400 py-20">
          Chưa có lịch khám nào
        </p>
      ) : (
        appointments.map((a) => {
          const s = STATUS[a.status] || {
            label: a.status,
            color: "bg-slate-100 text-slate-600",
          };
          return (
            <div
              key={a.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600 flex-shrink-0">
                <Calendar size={22} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800">BN. {a.patientName}</p>
                <p className="text-slate-500 text-sm mt-1">
                  {new Date(a.appointmentTime).toLocaleString("vi-VN")}
                </p>
                {a.note && (
                  <p className="text-slate-400 text-xs mt-1">{a.note}</p>
                )}
              </div>
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-lg ${s.color}`}
              >
                {s.label}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
