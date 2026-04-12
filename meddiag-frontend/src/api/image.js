import api from "./axios";

export const uploadImage = (formData, onProgress) =>
  api.post("/images/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
    },
  });

export const getImageDetail = (id) => api.get(`/images/${id}`);
