import api from "./axios";

export const createAppointment = (doctorId, appointmentTime, note) =>
  api.post("/appointments", { doctorId, appointmentTime, note });

export const getAppointments = () => api.get("/appointments");
