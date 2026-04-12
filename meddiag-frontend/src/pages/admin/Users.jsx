import { useEffect, useState } from "react";
import { getUsers, toggleUser, createDoctor } from "../../api/admin";
import toast from "react-hot-toast";
import { UserPlus, X } from "lucide-react";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    email: "",
    fullName: "",
    specialization: "",
    licenseNumber: "",
    yearsOfExperience: 0,
  });

  const load = () =>
    getUsers()
      .then((r) => setUsers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const handleToggle = async (id) => {
    try {
      const res = await toggleUser(id);
      toast.success(res.data.message);
      load();
    } catch {
      toast.error("Thao tác thất bại");
    }
  };

  const handleCreate = async () => {
    if (!form.username || !form.password || !form.email || !form.fullName) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    try {
      await createDoctor({
        ...form,
        yearsOfExperience: Number(form.yearsOfExperience),
      });
      toast.success("Tạo tài khoản bác sĩ thành công!");
      setShowForm(false);
      setForm({
        username: "",
        password: "",
        email: "",
        fullName: "",
        specialization: "",
        licenseNumber: "",
        yearsOfExperience: 0,
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Tạo thất bại");
    }
  };

  const ROLE_COLOR = {
    admin: "bg-red-100 text-red-700",
    doctor: "bg-blue-100 text-blue-700",
    patient: "bg-green-100 text-green-700",
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
          Quản lý người dùng
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition"
        >
          <UserPlus size={16} /> Thêm bác sĩ
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800">
              Tạo tài khoản bác sĩ mới
            </h2>
            <button
              onClick={() => setShowForm(false)}
              className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-200 transition"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "username", label: "Username *", type: "text" },
              { key: "password", label: "Mật khẩu *", type: "password" },
              { key: "email", label: "Email *", type: "email" },
              { key: "fullName", label: "Họ tên *", type: "text" },
              { key: "specialization", label: "Chuyên khoa", type: "text" },
              { key: "licenseNumber", label: "Số giấy phép", type: "text" },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {f.label}
                </label>
                <input
                  type={f.type}
                  value={form[f.key]}
                  onChange={(e) =>
                    setForm({ ...form, [f.key]: e.target.value })
                  }
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Kinh nghiệm (năm)
              </label>
              <input
                type="number"
                value={form.yearsOfExperience}
                onChange={(e) =>
                  setForm({ ...form, yearsOfExperience: e.target.value })
                }
                className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="mt-4 w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition"
          >
            Tạo tài khoản
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {[
                "Họ tên",
                "Username",
                "Email",
                "Role",
                "Trạng thái",
                "Thao tác",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition">
                <td className="px-5 py-4 font-medium text-slate-800">
                  {u.fullName}
                </td>
                <td className="px-5 py-4 text-slate-500 text-sm">
                  {u.username}
                </td>
                <td className="px-5 py-4 text-slate-500 text-sm">{u.email}</td>
                <td className="px-5 py-4">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-lg ${ROLE_COLOR[u.role] || "bg-slate-100 text-slate-600"}`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-lg ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                  >
                    {u.isActive ? "Hoạt động" : "Vô hiệu"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => handleToggle(u.id)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition
                      ${u.isActive ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-green-100 text-green-600 hover:bg-green-200"}`}
                  >
                    {u.isActive ? "Vô hiệu hóa" : "Kích hoạt"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
