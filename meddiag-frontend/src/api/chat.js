import api from "./axios";

export const createConversation = (doctorId) =>
  api.post("/chat/conversations", { doctorId: doctorId ?? null });

export const getConversations = () => api.get("/chat/conversations");

export const sendMessage = (conversationId, content, imageId) =>
  api.post("/chat/messages", {
    conversationId,
    content,
    imageId: imageId ?? null,
  });

export const getMessages = (conversationId) =>
  api.get(`/chat/messages/${conversationId}`);
