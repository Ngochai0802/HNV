import api from "./axios";

export const createConversation = (doctorId, patientId) =>
  api.post("/chat/conversations", { 
      doctorId: doctorId ?? null,
      patientId: patientId ?? null 
  });

export const getConversations = () => api.get("/chat/conversations");

export const sendMessage = (conversationId, content, imageId) =>
  api.post("/chat/messages", {
    conversationId,
    content,
    imageId: imageId ?? null,
  });

export const getMessages = (conversationId) =>
  api.get(`/chat/messages/${conversationId}`);

export const archiveConversation = (conversationId, isArchived) =>
  api.patch(`/chat/conversations/${conversationId}/archive?isArchived=${isArchived}`);

export const getAiDraft = (conversationId) =>
  api.get(`/chat/conversations/${conversationId}/ai-draft`);
