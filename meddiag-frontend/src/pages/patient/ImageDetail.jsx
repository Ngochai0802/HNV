import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { getImageDetail } from "../../api/image";
import { getDiagnosis } from "../../api/patient";
import { ArrowLeft, Brain, Stethoscope } from "lucide-react";
//Hàm màu mức độ nguy hiểm
const getSeverityStyle = (severity) => {
  switch (severity) {
    case "danger": return "bg-red-100 text-red-700 border-red-200";
    case "warning": return "bg-orange-100 text-orange-700 border-orange-200";
    default: return "bg-green-100 text-green-700 border-green-200";
  }
};
export default function ImageDetail() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    let intervalId = null;

    const fetchData = async () => {
      try {
        const [detailRes, diagRes] = await Promise.all([
          getImageDetail(id),
          getDiagnosis(id).catch(() => ({ data: null })),
        ]);

        const detailData = detailRes.data;
        setDetail(detailData);
        setDiagnosis(diagRes.data?.diagnosis ?? null);
        setLoading(false);

        // ✅ Nếu đã có kết quả AI thì dừng polling
        if (detailData?.aiResult) {
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    // Gọi lần đầu ngay
    fetchData();

    // Poll mỗi 3 giây nếu chưa có kết quả
    intervalId = setInterval(fetchData, 3000);

    // Cleanup khi unmount
    return () => clearInterval(intervalId);
  }, [id]);
  useEffect(() => {
    if (detail?.boundingBoxes?.length) {
      // Nếu ảnh đã load rồi thì vẽ luôn
      if (imgRef.current?.complete) {
        drawBoxes();
      }
    }
  }, [detail]); // Chạy lại mỗi khi detail thay đổi
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
              src={
                detail.aiResult?.heatmapUrl
                  ? `http://localhost:5255${detail.aiResult.heatmapUrl}`
                  : `http://localhost:5255${detail.imageUrl}`
              }
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
              <div className="space-y-4">
                {/* Mức độ nghiêm trọng (Màu sắc) */}
                <div className={`p-3 rounded-xl border flex items-center justify-between ${getSeverityStyle(detail.aiResult.severity)}`}>
                  <span className="text-sm font-medium">Mức độ:</span>
                  <span className="font-bold">{detail.aiResult.severityText || "Bình thường"}</span>
                </div>

                {/* Dự đoán và Độ tin cậy */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-slate-500 text-xs">Dự đoán</p>
                    <p className="font-bold">{detail.aiResult.predictionLabel}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-slate-500 text-xs">Độ tin cậy</p>
                    <p className="font-bold text-blue-600">{detail.aiResult.confidenceScore.toFixed(1)}%</p>
                  </div>
                </div>

                {/* Dòng khuyến nghị */}
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <div className="flex gap-2">
                    <Brain size={18} className="text-blue-600 shrink-0" />
                    <div>
                      <p className="text-blue-800 font-bold text-sm">Khuyến nghị từ AI:</p>
                      <p className="text-blue-700 text-sm mt-1">{detail.aiResult.recommendation || "Tiếp tục theo dõi sức khỏe định kỳ."}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p>Đang tải kết quả...</p>
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
