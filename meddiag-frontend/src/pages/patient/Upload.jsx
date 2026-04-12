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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Upload ảnh X-quang
        </h1>
        <p className="text-slate-500 mt-1">
          Chỉ chấp nhận file JPG, PNG. Tối đa 10MB.
        </p>
      </div>

      {!file ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-300
            ${isDragActive ? "border-blue-500 bg-blue-50 scale-[1.02]" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"}`}
        >
          <input {...getInputProps()} />
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CloudUpload
              size={36}
              className={`transition-colors ${isDragActive ? "text-blue-600" : "text-blue-500"}`}
            />
          </div>
          <p className="text-slate-700 font-bold text-lg">
            {isDragActive ? "Thả ảnh vào đây..." : "Kéo thả ảnh vào đây"}
          </p>
          <p className="text-slate-400 text-sm mt-2">
            hoặc click để chọn file từ máy tính
          </p>
          <div className="flex items-center justify-center gap-4 mt-6">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <FileImage size={14} /> JPG, PNG
            </span>
            <span className="w-1 h-1 bg-slate-300 rounded-full" />
            <span className="text-xs text-slate-400">Tối đa 10MB</span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Ảnh preview lớn */}
          <div className="relative bg-slate-900">
            <img
              src={preview}
              alt="preview"
              className="w-full max-h-96 object-contain p-2"
            />
            {!uploaded && !loading && (
              <button
                onClick={handleRemove}
                className="absolute top-3 right-3 w-9 h-9 bg-red-500/90 backdrop-blur-sm text-white rounded-xl flex items-center justify-center hover:bg-red-600 transition shadow-lg"
              >
                <X size={18} />
              </button>
            )}

            {/* Upload success overlay */}
            {uploaded && (
              <div className="absolute inset-0 bg-emerald-600/90 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-fadeIn">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle size={36} />
                </div>
                <p className="text-xl font-bold">Upload thành công!</p>
                <p className="text-emerald-200 text-sm mt-1">
                  AI đang phân tích ảnh của bạn...
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="p-5 space-y-4">
            {/* File info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileImage size={20} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 truncate text-sm">
                  {file.name}
                </p>
                <p className="text-slate-400 text-xs">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {progress === 100 && (
                <CheckCircle size={20} className="text-emerald-500" />
              )}
            </div>

            {/* Progress bar */}
            {loading && (
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-500">Đang upload...</span>
                  <span className="font-bold text-blue-600">{progress}%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload button */}
            {!uploaded && (
              <button
                onClick={handleUpload}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <UploadIcon size={18} /> Upload & Phân tích AI
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
