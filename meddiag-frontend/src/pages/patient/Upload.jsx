import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import { uploadImage } from "../../api/image";
import toast from "react-hot-toast";
import {
  Upload as UploadIcon,
  X,
  CheckCircle,
  FileImage,
  CloudUpload,
} from "lucide-react";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const navigate = useNavigate();

  const onDrop = useCallback((accepted) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setProgress(0);
    setUploaded(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [] },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    try {
      const res = await uploadImage(formData, setProgress);
      setUploaded(true);
      toast.success("Upload thành công! AI đang phân tích...");
      // Đợi 2s cho user thấy ảnh rồi chuyển trang
      setTimeout(() => {
        navigate(`/patient/images/${res.data.imageId}`);
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setProgress(0);
    setUploaded(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      {/* PHẦN 1: TIÊU ĐỀ (Thay cho cụm h1, p cũ) */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-slate-900">Hệ thống Chẩn đoán MedDiag</h1>
        <p className="text-slate-500 italic">Sử dụng AI Model v2.1 để phân tích hình ảnh X-quang phổi</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* CỘT CHÍNH (Chiếm 2/3): HIỂN THỊ UPLOAD/PREVIEW */}
        <div className="lg:col-span-2 shadow-2xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
          {!file ? (
            /* --- VỊ TRÍ 2: VÙNG DROPZONE MỚI --- */
            <div
              {...getRootProps()}
              className={`p-20 text-center cursor-pointer transition-all border-4 border-dashed m-4 rounded-2xl
                ${isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-100 hover:border-blue-300 hover:bg-slate-50"}`}
            >
              <input {...getInputProps()} />
              <div className="space-y-4">
                <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-200">
                  <CloudUpload size={40} className="text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-800">Tải lên dữ liệu mới</p>
                  <p className="text-slate-400 text-sm mt-1">Kéo thả hoặc nhấp để chọn file từ máy</p>
                </div>
              </div>
            </div>
          ) : (
            /* --- VỊ TRÍ 3: VÙNG PREVIEW VÀ PROGRESS MỚI --- */
            <div className="p-6 space-y-6">
              {/* Thông tin file */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <FileImage size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                {!uploaded && !loading && (
                  <button onClick={handleRemove} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                )}
              </div>

              {/* Ảnh Preview */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner group">
                <img src={preview} alt="preview" className="w-full max-h-[450px] object-contain mx-auto transition-transform duration-500 group-hover:scale-[1.02]" />
                {uploaded && (
                  <div className="absolute inset-0 bg-emerald-600/90 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 shadow-xl">
                      <CheckCircle size={40} />
                    </div>
                    <p className="text-xl font-bold">Xác nhận dữ liệu thành công!</p>
                    <p className="text-emerald-100 text-sm mt-1">Đang chuyển đến màn hình chẩn đoán...</p>
                  </div>
                )}
              </div>

              {/* Progress & Nút bấm */}
              <div className="pt-2">
                {loading && (
                  <div className="mb-6 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 font-medium">Tiến trình xử lý:</span>
                      <span className="text-blue-600 font-bold">{progress}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
                {!uploaded && (
                  <button
                    onClick={handleUpload}
                    disabled={loading}
                    className="w-full bg-slate-900 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl active:scale-[0.98]"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CloudUpload size={20} />
                        Bắt đầu phân tích AI ngay
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        
        {/* CỘT PHỤ (Chiếm 1/3): HƯỚNG DẪN BỔ SUNG */}
        <div className="space-y-6">
          <div className="bg-blue-950 rounded-3xl p-6 text-white shadow-xl shadow-blue-900/20 border border-blue-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl" />

            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-400">
              <CheckCircle size={20} /> Tiêu chuẩn hình ảnh
            </h3>

            <ul className="space-y-4 text-sm text-blue-100/80 font-medium relative z-10">
              <li className="flex gap-3">
                <span className="text-blue-500 font-bold">01.</span>
                <span>Định dạng hỗ trợ: <strong className="text-white">JPG, JPEG, PNG</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-500 font-bold">02.</span>
                <span>Dung lượng tập tin: <strong className="text-white">Tối đa 10MB</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-500 font-bold">03.</span>
                <span>Góc chụp: Ảnh X-quang ngực thẳng (PA View)</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-500 font-bold">04.</span>
                <span>Chất lượng: Rõ nét, không bị mờ hoặc lóa sáng</span>
              </li>
            </ul>

            <div className="mt-6 pt-6 border-t border-blue-800/50">
              <p className="text-[11px] text-blue-300/60 leading-relaxed italic">
                * Lưu ý: Hình ảnh không đúng tiêu chuẩn sẽ ảnh hưởng đến độ chính xác của AI Model.
              </p>
            </div>
          </div>

          <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 shadow-sm">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Thông tin bảo mật</p>
            <p className="text-sm text-blue-800 leading-relaxed">
              Dữ liệu được xử lý ẩn danh và truyền tải qua giao thức bảo mật để bảo vệ quyền riêng tư.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}