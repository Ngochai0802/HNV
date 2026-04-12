import { useEffect, useState } from "react";
import { getAppointments, createAppointment } from "../../api/appointment";
import { getPatientDoctors } from "../../api/patient";
import toast from "react-hot-toast";
import {
  Calendar,
  Plus,
  X,
  Clock,
  CheckCircle,
  XCircle,
  CalendarPlus,
  User,
} from "lucide-react";

const STATUS = {
  pending: {
    label: "Chờ xác nhận",
    color: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: <Clock size={14} />,
  },
  confirmed: {
    label: "Đã xác nhận",
    color: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: <CheckCircle size={14} />,
  },
  cancelled: {
    label: "Đã hủy",
    color: "bg-red-50 text-red-700 border border-red-200",
    icon: <XCircle size={14} />,
  },
};

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    doctorId: "",
    appointmentTime: "",
    note: "",
  });

  useEffect(() => {
    Promise.all([getAppointments(), getPatientDoctors()])
      .then(([apptRes, docRes]) => {
        setAppointments(apptRes.data);
        setDoctors(docRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!form.doctorId || !form.appointmentTime) {
      toast.error("Vui lòng chọn bác sĩ và thời gian");
      return;
    }
    setSubmitting(true);
    try {
      await createAppointment(
        Number(form.doctorId),
        form.appointmentTime,
        form.note,
      );
      toast.success("Đặt lịch thành công!");
      setShowForm(false);
      setForm({ doctorId: "", appointmentTime: "", note: "" });
      const res = await getAppointments();
      setAppointments(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Đặt lịch thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lịch khám</h1>
          <p className="text-slate-500 text-sm mt-1">
            Quản lý các cuộc hẹn khám với bác sĩ
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/20"
        >
          <CalendarPlus size={16} /> Đặt lịch mới
        </button>
      </div>

      {/* Form đặt lịch */}
      {showForm && (
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <CalendarPlus size={20} className="text-blue-600" />
              </div>
              <h2 className="font-bold text-slate-800">Đặt lịch khám mới</h2>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-200 transition"
            >
              <X size={16} />
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Chọn bác sĩ
            </label>
            <select
              value={form.doctorId}
              onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
              className="w-full mt-2 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">-- Chọn bác sĩ --</option>
              {doctors.map((d) => (
                <option key={d.userId} value={d.userId}>
                  {d.fullName}{" "}
                  {d.specialization ? `— ${d.specialization}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Thời gian khám
            </label>
            <input
              type="datetime-local"
              value={form.appointmentTime}
              onChange={(e) =>
                setForm({ ...form, appointmentTime: e.target.value })
              }
              className="w-full mt-2 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Ghi chú
            </label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={3}
              placeholder="Triệu chứng, yêu cầu đặc biệt..."
              className="w-full mt-2 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle size={18} /> Xác nhận đặt lịch
              </>
            )}
          </button>
        </div>
      )}

      {/* Danh sách lịch */}
      {appointments.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar size={28} className="text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">Chưa có lịch khám nào</p>
          <p className="text-slate-400 text-sm mt-1">
            Đặt lịch để khám với bác sĩ chuyên khoa
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => {
            const s = STATUS[a.status] || {
              label: a.status,
              color: "bg-slate-50 text-slate-600 border border-slate-200",
              icon: null,
            };
            const dateObj = new Date(a.appointmentTime);
            const day = dateObj.toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
            });
            const time = dateObj.toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={a.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-all duration-300"
              >
                {/* Date badge */}
                <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border border-blue-100">
                  <span className="text-xs font-bold text-blue-600">
                    {day}
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {time}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800">BS. {a.doctorName}</p>
                  <p className="text-slate-400 text-sm mt-0.5">
                    {dateObj.toLocaleDateString("vi-VN", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  {a.note && (
                    <p className="text-slate-400 text-xs mt-1 truncate">
                      {a.note}
                    </p>
                  )}
                </div>

                <span
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 flex-shrink-0 ${s.color}`}
                >
                  {s.icon}
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
