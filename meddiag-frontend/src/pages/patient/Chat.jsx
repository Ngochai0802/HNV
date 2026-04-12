import { useEffect, useState, useRef } from "react";
import {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
} from "../../api/chat";
import { getPatientDoctors } from "../../api/patient";
import useAuthStore from "../../store/useAuthStore";
import toast from "react-hot-toast";
import {
  Send,
  Plus,
  Bot,
  MessageSquare,
  User,
  Stethoscope,
  Search,
} from "lucide-react";

export default function PatientChat() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [showDoctors, setShowDoctors] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    Promise.all([getConversations(), getPatientDoctors()])
      .then(([convRes, docRes]) => {
        setConversations(convRes.data);
        setDoctors(docRes.data || []);
        if (convRes.data.length > 0) {
          loadMessages(convRes.data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setInitLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async (convId) => {
    setActiveConv(convId);
    setShowDoctors(false);
    const res = await getMessages(convId).catch(() => ({ data: [] }));
    setMessages(res.data);
  };

  const handleNewConv = async (doctorId, doctorName) => {
    try {
      const res = await createConversation(doctorId);
      toast.success(`Đã tạo cuộc trò chuyện với BS. ${doctorName}`);
      const convRes = await getConversations();
      setConversations(convRes.data);
      loadMessages(res.data.conversationId);
    } catch {
      toast.error("Không thể tạo cuộc trò chuyện");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeConv) return;
    const text = input.trim();
    setInput("");
    setLoading(true);
    try {
      await sendMessage(activeConv, text, null);
      const res = await getMessages(activeConv);
      setMessages(res.data);
    } catch {
      toast.error("Gửi thất bại");
    } finally {
      setLoading(false);
    }
  };

  // Tìm tên đối phương trong conversation
  const getOtherPerson = (conv) => {
    return conv.participants?.find((p) => p.userId !== user?.id);
  };

  if (initLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-slate-100 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 text-sm">Tin nhắn</h3>
            <button
              onClick={() => setShowDoctors(!showDoctors)}
              className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition"
              title="Cuộc trò chuyện mới"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Danh sách bác sĩ để tạo conversation mới */}
          {showDoctors && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2 mb-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Chọn bác sĩ để trò chuyện
              </p>
              {doctors.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">
                  Chưa có bác sĩ nào được phân công
                </p>
              ) : (
                doctors.map((d) => (
                  <button
                    key={d.userId}
                    onClick={() =>
                      handleNewConv(d.userId, d.fullName)
                    }
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white transition text-left"
                  >
                    <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Stethoscope size={14} className="text-teal-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        BS. {d.fullName}
                      </p>
                      {d.specialization && (
                        <p className="text-xs text-slate-400 truncate">
                          {d.specialization}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* List conversations */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center py-10 px-4">
              <MessageSquare
                size={36}
                className="mx-auto mb-3 text-slate-300"
              />
              <p className="text-sm text-slate-400">
                Chưa có cuộc trò chuyện
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Nhấn + để bắt đầu chat với bác sĩ
              </p>
            </div>
          ) : (
            conversations.map((c) => {
              const other = getOtherPerson(c);
              const isActive = activeConv === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => loadMessages(c.id)}
                  className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-200
                    ${isActive ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50 border border-transparent"}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}
                    >
                      <Stethoscope size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm truncate ${isActive ? "font-bold text-blue-700" : "font-medium text-slate-700"}`}
                      >
                        BS. {other?.fullName || "Bác sĩ"}
                      </p>
                      {c.lastMessage && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {c.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {activeConv ? (
          <>
            {/* Chat header */}
            {(() => {
              const conv = conversations.find((c) => c.id === activeConv);
              const other = conv ? getOtherPerson(conv) : null;
              return (
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                  <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center">
                    <Stethoscope size={16} className="text-teal-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">
                      BS. {other?.fullName || "Bác sĩ"}
                    </p>
                    <p className="text-xs text-slate-400">Bác sĩ chẩn đoán</p>
                  </div>
                </div>
              );
            })()}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                  <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Bắt đầu cuộc trò chuyện</p>
                </div>
              )}
              {messages.map((m) => {
                const isMe = m.senderId === user?.id;
                const isAI = m.isAiGenerated;

                return (
                  <div
                    key={m.id}
                    className={`flex items-end gap-2.5 ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    {/* Avatar bên trái cho người khác */}
                    {!isMe && (
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isAI ? "bg-purple-100" : "bg-teal-100"}`}
                      >
                        {isAI ? (
                          <Bot size={15} className="text-purple-600" />
                        ) : (
                          <Stethoscope size={14} className="text-teal-600" />
                        )}
                      </div>
                    )}

                    <div
                      className={`max-w-xs lg:max-w-md ${isMe ? "order-1" : ""}`}
                    >
                      {/* Tên người gửi */}
                      {!isMe && (
                        <p
                          className={`text-xs font-semibold mb-1 ml-1 ${isAI ? "text-purple-500" : "text-teal-600"}`}
                        >
                          {isAI ? "AI Assistant" : `BS. ${m.senderName}`}
                        </p>
                      )}

                      {/* Bubble tin nhắn */}
                      <div
                        className={`px-4 py-3 text-sm leading-relaxed
                          ${
                            isMe
                              ? "bg-blue-600 text-white rounded-2xl rounded-br-md shadow-sm"
                              : isAI
                                ? "bg-purple-50 text-slate-700 border border-purple-100 rounded-2xl rounded-bl-md"
                                : "bg-slate-100 text-slate-700 rounded-2xl rounded-bl-md"
                          }`}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>

                      {/* Thời gian */}
                      <p
                        className={`text-[10px] mt-1 ${isMe ? "text-right mr-1" : "ml-1"} text-slate-400`}
                      >
                        {new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {/* Avatar bên phải cho mình */}
                    {isMe && (
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User size={15} className="text-blue-600" />
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-100 flex gap-3 bg-white">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleSend()
                }
                placeholder="Nhập tin nhắn..."
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="w-11 h-11 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center">
              <MessageSquare size={36} className="text-slate-300" />
            </div>
            <div className="text-center">
              <p className="font-medium text-slate-500">
                Chọn cuộc trò chuyện
              </p>
              <p className="text-sm mt-1">
                Hoặc nhấn + để chat với bác sĩ
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
