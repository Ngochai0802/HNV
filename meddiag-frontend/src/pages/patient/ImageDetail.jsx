import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { getImageDetail } from "../../api/image";
import { getDiagnosis } from "../../api/patient";
import { ArrowLeft, Brain, Stethoscope } from "lucide-react";

export default function ImageDetail() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(true);
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
        {/* ẢNH + BOUNDING BOX */}
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

        {/* KẾT QUẢ AI + CHẨN ĐOÁN */}
        <div className="space-y-4">
          {/* AI Result */}
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
                <div className="h-2 bg-slate-100 rounded-full">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{
                      width: `${detail.aiResult.confidenceScore * 100}%`,
                    }}
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
                  <p className="font-bold text-slate-800">
                    {diagnosis.finalResult}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-slate-500 text-xs mb-1">Mức độ</p>
                  <p className="font-bold text-slate-800">
                    {diagnosis.severityLevel}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-slate-500 text-xs mb-1">Ghi chú</p>
                  <p className="text-slate-700 text-sm">
                    {diagnosis.diagnosisText}
                  </p>
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
        </div>
      </div>
    </div>
  );
}
