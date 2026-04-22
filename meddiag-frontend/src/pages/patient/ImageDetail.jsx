import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getImageDetail } from "../../api/image";
import { getDiagnosis, getMyDoctor } from "../../api/patient";
import { createConversation, sendMessage, getConversations } from "../../api/chat";
import { ArrowLeft, Brain, Stethoscope, MessageCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function ImageDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [consulting, setConsulting] = useState(false);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    Promise.all([
      getImageDetail(id),
      getDiagnosis(id).catch(() => ({ data: null })),
    ])
      .then(([detailRes, diagRes]) => {
        setDetail(detailRes.data);
        setDiagnosis(diagRes.data?.diagnosis ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Vẽ bounding box lên canvas
  const drawBoxes = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !detail?.boundingBoxes?.length) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 3;
    ctx.font = "bold 16px sans-serif";
    ctx.fillStyle = "#ef4444";
    detail.boundingBoxes.forEach((box) => {
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.fillText("Bất thường", box.x + 4, box.y - 6);
    });
  };

  // =============================================
  // Xử lý nút "Nhận tư vấn Bác sĩ về ca này"
  // =============================================
  const handleConsult = async () => {
    setConsulting(true);
    try {
      // 1. Lấy bác sĩ đã chẩn đoán ca này
      if (!diagnosis || !diagnosis.doctorId) {
        toast.error("Chưa có bác sĩ chẩn đoán. Vui lòng đợi kết quả chẩn đoán trước khi xin tư vấn.");
        return;
      }
      
      const targetDoctorId = diagnosis.doctorId;

      // 2. Kiểm tra đã có conversation với bác sĩ này chưa
      const convRes = await getConversations();
      const existingConv = convRes.data.find((c) =>
        c.participants?.some((p) => p.userId === targetDoctorId)
      );

      let convId;
      if (existingConv) {
        convId = existingConv.id;
      } else {
        // 3. Tạo conversation mới với bác sĩ
        const newConv = await createConversation(targetDoctorId);
        convId = newConv.data.conversationId;
      }

      // 4. Gửi tin nhắn đầu tiên tự động tóm tắt ca bệnh
      const aiLabel = detail?.aiResult?.predictionLabel || "Chưa có";
      const aiConf  = detail?.aiResult
        ? `${(detail.aiResult.confidenceScore * 100).toFixed(1)}%`
        : "—";
      const diagText = diagnosis
        ? `\n📋 Chẩn đoán bác sĩ: ${diagnosis.finalResult} (${diagnosis.severityLevel})`
        : "\n📋 Chẩn đoán bác sĩ: Chưa có";

      const autoMsg =
        `🩻 Bác sĩ ơi, em cần tư vấn về ca chẩn đoán ảnh X-quang:\n` +
        `📁 Ảnh: ${detail?.fileName}\n` +
        `🤖 Kết quả AI: ${aiLabel} (độ tin cậy ${aiConf})` +
        diagText +
        `\n\nEm có thể được giải thích thêm về kết quả này không ạ?`;

      await sendMessage(convId, autoMsg, parseInt(id));

      toast.success("Đã gửi yêu cầu tư vấn! Đang chuyển sang trang chat...");

      // 5. Redirect sang Chat với convId đã mở sẵn
      setTimeout(() => {
        navigate(`/patient/chat?convId=${convId}`);
      }, 800);

    } catch (err) {
      console.error(err);
      toast.error("Không thể tạo yêu cầu tư vấn. Vui lòng thử lại.");
    } finally {
      setConsulting(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!detail)
    return (
      <p className="text-center text-slate-500 mt-20">Không tìm thấy ảnh</p>
    );

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          to="/patient/images"
          className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 transition"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 truncate">
          {detail.fileName}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CỘT TRÁI: ẢNH + BOUNDING BOX */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-700 mb-3">Ảnh X-quang</h2>
          <div className="relative inline-block w-full">
            <img
              ref={imgRef}
              src={`http://localhost:5255${detail.imageUrl}`}
              alt={detail.fileName}
              className="w-full rounded-xl object-contain bg-slate-50"
              onLoad={drawBoxes}
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />
          </div>
        </div>

        {/* CỘT PHẢI: KẾT QUẢ AI + CHẨN ĐOÁN + NÚT TƯ VẤN */}
        <div className="space-y-4">

          {/* Kết quả AI */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={20} className="text-purple-600" />
              <h2 className="font-bold text-slate-700">Kết quả AI</h2>
            </div>
            {detail.aiResult ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 text-sm">Dự đoán</span>
                  <span className="font-bold text-slate-800">
                    {detail.aiResult.predictionLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 text-sm">Độ tin cậy</span>
                  <span className="font-bold text-blue-600">
                    {(detail.aiResult.confidenceScore * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700"
                    style={{ width: `${detail.aiResult.confidenceScore * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">
                {detail.inference?.status === "pending"
                  ? "AI đang phân tích..."
                  : "Chưa có kết quả AI"}
              </p>
            )}
          </div>

          {/* Chẩn đoán bác sĩ */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope size={20} className="text-green-600" />
              <h2 className="font-bold text-slate-700">Chẩn đoán bác sĩ</h2>
            </div>
            {diagnosis ? (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-slate-500 text-xs mb-1">Kết quả</p>
                  <p className="font-bold text-slate-800">{diagnosis.finalResult}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-slate-500 text-xs mb-1">Mức độ</p>
                  <p className="font-bold text-slate-800">{diagnosis.severityLevel}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-slate-500 text-xs mb-1">Ghi chú</p>
                  <p className="text-slate-700 text-sm">{diagnosis.diagnosisText}</p>
                </div>
                <p className="text-xs text-slate-400">
                  Bác sĩ: {diagnosis.doctorName} —{" "}
                  {new Date(diagnosis.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Bác sĩ chưa chẩn đoán</p>
            )}
          </div>

          {/* ========== NÚT TƯ VẤN BÁC SĨ ========== */}
          <button
            onClick={handleConsult}
            disabled={consulting || !diagnosis}
            className="w-full flex items-center justify-center gap-3 py-4 px-6
              bg-gradient-to-r from-blue-600 to-blue-700
              hover:from-blue-700 hover:to-blue-800
              text-white rounded-2xl font-bold text-sm
              transition-all duration-200
              shadow-lg shadow-blue-600/25
              hover:shadow-xl hover:shadow-blue-600/30
              hover:-translate-y-0.5
              disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {consulting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Đang tạo yêu cầu tư vấn...
              </>
            ) : (
              <>
                <MessageCircle size={18} />
                Nhận tư vấn từ Bác sĩ về ca này
              </>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}
