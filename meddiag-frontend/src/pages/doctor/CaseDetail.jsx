import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getDoctorImage,
  createDiagnosis,
  getSuggestions,
  useSuggestion,
} from "../../api/doctor";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Brain,
  Stethoscope,
  Lightbulb,
  CheckCircle,
  Save,
} from "lucide-react";

const SEVERITY = ["low", "medium", "high", "critical"];
const SEVERITY_COLOR = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default function CaseDetail() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    diagnosisText: "",
    finalResult: "",
    severityLevel: "medium",
  });
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    getDoctorImage(id)
      .then((res) => {
        setDetail(res.data);
        if (res.data.diagnosis) {
          setForm({
            diagnosisText: res.data.diagnosis.diagnosisText || "",
            finalResult: res.data.diagnosis.finalResult || "",
            severityLevel: res.data.diagnosis.severityLevel || "medium",
          });
        }
        return getSuggestions(id);
      })
      .then((res) => setSuggestions(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const drawBoxes = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !detail?.boundingBoxes?.length) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 4;
    ctx.font = "bold 18px sans-serif";
    ctx.fillStyle = "#ef4444";
    detail.boundingBoxes.forEach((box) => {
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.fillStyle = "rgba(239,68,68,0.15)";
      ctx.fillRect(box.x, box.y, box.width, box.height);
      ctx.fillStyle = "#ef4444";
      ctx.fillText("⚠ Bất thường", box.x + 4, box.y - 8);
    });
  };

  const handleUseSuggestion = async (s) => {
    setForm((prev) => ({ ...prev, diagnosisText: s.suggestedText }));
    await useSuggestion(s.id, true).catch(() => {});
    setSuggestions((prev) =>
      prev.map((sg) => (sg.id === s.id ? { ...sg, isUsedByDoctor: true } : sg)),
    );
    toast.success("Đã áp dụng gợi ý AI");
  };

  const handleSave = async () => {
    if (!form.finalResult.trim()) {
      toast.error("Vui lòng nhập kết quả chẩn đoán");
      return;
    }
    setSaving(true);
    try {
      await createDiagnosis({ imageId: Number(id), ...form });
      toast.success("Lưu chẩn đoán thành công! Bệnh nhân đã được thông báo.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!detail)
    return (
      <p className="text-center text-slate-400 mt-20">Không tìm thấy ca bệnh</p>
    );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          to="/doctor/cases"
          className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 transition"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800 truncate">
            {detail.image.fileName}
          </h1>
          <p className="text-slate-500 text-sm">
            Bệnh nhân: {detail.image.patientName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* CỘT TRÁI — Ảnh */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              Ảnh X-quang
              {detail.boundingBoxes?.length > 0 && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-lg font-bold">
                  {detail.boundingBoxes.length} vùng bất thường
                </span>
              )}
            </h2>
            <div className="relative inline-block w-full">
              <img
                ref={imgRef}
                src={`http://localhost:5255${detail.image.imageUrl}`}
                alt={detail.image.fileName}
                className="w-full rounded-xl object-contain bg-slate-50 max-h-80"
                onLoad={drawBoxes}
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              />
            </div>
          </div>

          {/* Kết quả AI */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Brain size={18} className="text-purple-600" /> Kết quả AI
            </h2>
            {detail.aiResult ? (
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 text-sm">Dự đoán</span>
                  <span className="font-bold text-slate-800">
                    {detail.aiResult.predictionLabel}
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 text-sm">Độ tin cậy</span>
                  <span className="font-bold text-purple-600">
                    {(detail.aiResult.confidenceScore * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{
                      width: `${detail.aiResult.confidenceScore * 100}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Model: {detail.inference?.modelName}
                </p>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">
                {detail.inference?.status === "pending"
                  ? "AI đang phân tích..."
                  : "Chưa có kết quả AI"}
              </p>
            )}
          </div>

          {/* Gợi ý AI */}
          {suggestions.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Lightbulb size={18} className="text-yellow-500" /> Gợi ý từ AI
              </h2>
              <div className="space-y-2">
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    className={`p-3 rounded-xl border text-sm transition
                      ${s.isUsedByDoctor ? "border-green-200 bg-green-50" : "border-slate-200 bg-slate-50 hover:border-teal-300"}`}
                  >
                    <p className="text-slate-700 leading-relaxed">
                      {s.suggestedText}
                    </p>
                    {!s.isUsedByDoctor ? (
                      <button
                        onClick={() => handleUseSuggestion(s)}
                        className="mt-2 text-xs bg-teal-600 text-white px-3 py-1 rounded-lg hover:bg-teal-700 transition font-bold"
                      >
                        Dùng gợi ý này
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 mt-2 text-xs text-green-600 font-bold">
                        <CheckCircle size={12} /> Đã sử dụng
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CỘT PHẢI — Form chẩn đoán */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-fit">
          <h2 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Stethoscope size={18} className="text-teal-600" /> Chẩn đoán của
            bác sĩ
          </h2>

          {detail.diagnosis && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-xs font-bold text-green-600 mb-1">
                ✓ Đã có chẩn đoán — cập nhật lại bên dưới
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Kết quả chẩn đoán *
              </label>
              <input
                type="text"
                value={form.finalResult}
                onChange={(e) =>
                  setForm({ ...form, finalResult: e.target.value })
                }
                placeholder="VD: Viêm phổi, Bình thường, COVID-19..."
                className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Mức độ nghiêm trọng
              </label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {SEVERITY.map((s) => (
                  <button
                    key={s}
                    onClick={() => setForm({ ...form, severityLevel: s })}
                    className={`py-2 rounded-xl text-xs font-bold capitalize transition
                      ${form.severityLevel === s ? SEVERITY_COLOR[s] + " ring-2 ring-offset-1 ring-current" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                  >
                    {s === "low"
                      ? "Nhẹ"
                      : s === "medium"
                        ? "Trung bình"
                        : s === "high"
                          ? "Nặng"
                          : "Nguy kịch"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Ghi chú chi tiết
              </label>
              <textarea
                value={form.diagnosisText}
                onChange={(e) =>
                  setForm({ ...form, diagnosisText: e.target.value })
                }
                rows={6}
                placeholder="Mô tả chi tiết kết quả chẩn đoán, khuyến nghị điều trị..."
                className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} /> Lưu chẩn đoán
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
