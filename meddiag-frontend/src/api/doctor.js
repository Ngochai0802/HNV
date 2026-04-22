import api from "./axios";

export const getAssignments = (status) =>
  api.get("/doctor/assignments", { params: status ? { status } : {} });
export const getDoctorImage = (id) => api.get(`/doctor/images/${id}`);
export const createDiagnosis = (data) => api.post("/doctor/diagnoses", data);
export const getSuggestions = (imageId) =>
  api.get(`/doctor/suggestions/${imageId}`);
export const useSuggestion = (id, isUsed) =>
  api.patch(`/doctor/suggestions/${id}/use`, { isUsed });
export const getDoctorAppointments = () => api.get("/appointments");

// Profile
export const getDoctorProfile = () => api.get("/doctor/profile");
export const updateDoctorProfile = (data) => api.put("/doctor/profile", data);

