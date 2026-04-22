import { useState, useEffect, useRef } from "react";
import {
  X,
  Pencil,
  Save,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  UserCheck,
  Stethoscope,
  Hash,
  Award,
  AtSign,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import useAuthStore from "../../store/useAuthStore";
import { getPatientProfile, updatePatientProfile } from "../../api/patient";
import { getDoctorProfile, updateDoctorProfile } from "../../api/doctor";

function Field({ icon: Icon, label, value, name, type = "text", options, editing, onChange }) {
  const inputClass =
    "w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm text-slate-800";

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
        <Icon size={12} />
        {label}
      </label>
      {editing ? (
        options ? (
          <select name={name} value={value || ""} onChange={onChange} className={inputClass}>
            <option value="">-- Chọn --</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            name={name}
            value={value || ""}
            onChange={onChange}
            className={inputClass}
            max={type === "date" ? new Date().toISOString().split("T")[0] : undefined}
          />
        )
      ) : (
        <p className="text-sm text-slate-800 border border-transparent px-3 py-2 rounded-lg bg-slate-50">
          {value
            ? type === "date"
              ? new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" })
              : value
            : <span className="text-slate-400 italic">Chưa cập nhật</span>}
        </p>
      )}
    </div>
  );
}

export default function ProfileModal({ isOpen, onClose, role }) {
  const { user, setUser } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef(null);

  const isPatient = role === "patient";

  // Fetch profile khi mở modal
  useEffect(() => {
    if (!isOpen || !user) return;
    setLoading(true);
    const fetchFn = isPatient ? getPatientProfile : getDoctorProfile;
    fetchFn()
      .then((res) => {
        setProfile(res.data);
        setForm(res.data);
      })
      .catch(() => toast.error("Không thể tải thông tin"))
      .finally(() => setLoading(false));
  }, [isOpen, user, isPatient]);

  // Close khi click ngoài modal
  useEffect(() => {
    const handleClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        handleClose();
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // ESC key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") handleClose(); };
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const handleClose = () => {
    setEditing(false);
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saveFn = isPatient ? updatePatientProfile : updateDoctorProfile;
      await saveFn(form);
      setProfile(form);
      setEditing(false);
      // Cập nhật tên trong store nếu fullName thay đổi
      if (form.fullName !== user.fullName) {
        setUser({ ...user, fullName: form.fullName, email: form.email });
      }
      toast.success("Cập nhật thành công!");
    } catch {
      toast.error("Cập nhật thất bại, vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(profile);
    setEditing(false);
  };

  if (!isOpen) return null;

  const avatarLetter = profile?.fullName?.charAt(0)?.toUpperCase() || "?";
  const avatarBg = isPatient
    ? "from-blue-500 to-blue-700"
    : "from-teal-500 to-teal-700";
  const accentColor = isPatient ? "blue" : "teal";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-200"
        style={{ animation: "modalIn 0.2s ease-out" }}
      >
        {/* Header */}
        <div className={`relative bg-gradient-to-br ${avatarBg} p-6 rounded-t-2xl`}>
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {loading ? <Loader2 size={24} className="animate-spin" /> : avatarLetter}
            </div>
            <div className="text-white">
              <h2 className="text-xl font-bold">{profile?.fullName || "..."}</h2>
              <p className="text-white/70 text-sm">
                {isPatient ? "Bệnh nhân" : `BS. ${profile?.specialization || "Bác sĩ"}`}
              </p>
              <p className="text-white/60 text-xs mt-0.5">@{profile?.username}</p>
            </div>
          </div>

          {/* Edit button */}
          {!loading && (
            <div className="absolute bottom-4 right-4">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className={`flex items-center gap-2 px-4 py-2 bg-white text-${accentColor}-600 rounded-xl text-sm font-bold hover:bg-${accentColor}-50 transition shadow-md`}
                >
                  <Pencil size={14} /> Chỉnh sửa
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-green-600 rounded-lg text-sm font-bold hover:bg-green-50 transition disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Lưu
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className={`animate-spin text-${accentColor}-500`} />
            </div>
          ) : (
            <>
              {/* Thông tin cơ bản */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <User size={16} className={`text-${accentColor}-500`} />
                  Thông tin cá nhân
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    icon={User} label="Họ và tên" name="fullName"
                    value={editing ? form.fullName : profile?.fullName}
                    editing={editing} onChange={handleChange}
                  />
                  <Field
                    icon={AtSign} label="Tên đăng nhập" name="username"
                    value={profile?.username}
                    editing={false} onChange={() => {}}
                  />
                  <Field
                    icon={Mail} label="Email" name="email" type="email"
                    value={editing ? form.email : profile?.email}
                    editing={editing} onChange={handleChange}
                  />
                  {isPatient ? (
                    <>
                      <Field
                        icon={Phone} label="Số điện thoại" name="phone" type="tel"
                        value={editing ? form.phone : profile?.phone}
                        editing={editing} onChange={handleChange}
                      />
                      <Field
                        icon={Calendar} label="Ngày sinh" name="dateOfBirth" type="date"
                        value={editing
                          ? (form.dateOfBirth ? form.dateOfBirth.toString().split("T")[0] : "")
                          : profile?.dateOfBirth}
                        editing={editing} onChange={handleChange}
                      />
                      <Field
                        icon={UserCheck} label="Giới tính" name="gender"
                        value={editing ? form.gender : profile?.gender}
                        editing={editing} onChange={handleChange}
                        options={[
                          { value: "Male", label: "Nam" },
                          { value: "Female", label: "Nữ" },
                          { value: "Other", label: "Khác" },
                        ]}
                      />
                    </>
                  ) : (
                    <>
                      {/* Chỉ bác sĩ: các trường do Admin thiết lập, không cho sửa */}
                      <div className="sm:col-span-2">
                        <div className="flex items-center gap-2 mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 flex-shrink-0"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          <p className="text-xs text-amber-700 font-medium">Thông tin chuyên môn bên dưới do <strong>Admin</strong> quản lý — bác sĩ không thể chỉnh sửa</p>
                        </div>
                      </div>
                      <Field
                        icon={Stethoscope} label="Chuyên khoa" name="specialization"
                        value={profile?.specialization}
                        editing={false} onChange={() => {}}
                      />
                      <Field
                        icon={Hash} label="Số giấy phép" name="licenseNumber"
                        value={profile?.licenseNumber}
                        editing={false} onChange={() => {}}
                      />
                      <Field
                        icon={Award} label="Năm kinh nghiệm" name="yearsOfExperience"
                        value={profile?.yearsOfExperience != null ? `${profile.yearsOfExperience} năm` : null}
                        editing={false} onChange={() => {}}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Địa chỉ (chỉ bệnh nhân) */}
              {isPatient && (
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <MapPin size={16} className="text-blue-500" />
                    Địa chỉ
                  </h3>
                  <Field
                    icon={MapPin} label="Địa chỉ" name="address"
                    value={editing ? form.address : profile?.address}
                    editing={editing} onChange={handleChange}
                  />
                </div>
              )}

              {/* Thông tin tài khoản */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-400 text-center">
                  Vai trò: <span className="font-semibold capitalize">{profile?.role}</span>
                  {" · "}Tên đăng nhập không thể thay đổi
                  {!isPatient && " · Thông tin chuyên môn do Admin quản lý"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1)   translateY(0); }
        }
      `}</style>
    </div>
  );
}
