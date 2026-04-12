import api from "./axios";

export const getAdminImages = (status) =>
  api.get("/admin/images", { params: status ? { status } : {} });

export const getDoctors = () => api.get("/admin/doctors");

export const assignImage = (imageId, doctorId) =>
  api.post(`/admin/images/${imageId}/assign`, { doctorId });

export const getUsers = () => api.get("/admin/users");

export const toggleUser = (id) => api.patch(`/admin/users/${id}/toggle`);

export const createDoctor = (data) => api.post("/admin/doctors", data);
