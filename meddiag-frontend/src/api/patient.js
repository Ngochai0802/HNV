import api from "./axios";

export const getMyImages = () => api.get("/patient/images");
export const getDiagnosis = (id) => api.get(`/patient/images/${id}/diagnosis`);

// FIX BUG 1
export const getPatientDoctors = () => api.get("/patient/doctors");

// FIX BUG 2 (QUAN TRỌNG)
export const getMyDoctor = () => api.get("/patient/my-doctor");
