import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
} from "../../api/chat";
import { getAssignedDoctors } from "../../api/patient";
import useAuthStore from "../../store/useAuthStore";
import useSignalR from "../../hooks/useSignalR";
import toast from "react-hot-toast";
import {
  Send,
  Plus,
  Bot,
  MessageSquare,
  User,
  Stethoscope,
  X,
  FileImage,
  Paperclip,
  Check,
  CheckCheck,
  Search
} from "lucide-react";

export default function PatientChat() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const autoConvId = searchParams.get("convId"); // từ redirect ImageDetail

  const [conversations, setConversations] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [showDoctors, setShowDoctors] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const bottomRef = useRef(null);

  // SignalR real-time
  const { sendSignalRMessage } = useSignalR(activeConv, (msg) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        content: msg.content,
        senderName: msg.senderName,
        senderType: msg.isAi ? "ai" : "user",
        isAiGenerated: msg.isAi,
        senderId: null, // Tin nhắn nhận được coi như của người khác/AI
        createdAt: msg.createdAt,
      },
    ]);

    // Refresh danh sách conversation để cập nhật LastMessage và Sort lên đầu
    getConversations().then(res => setConversations(res.data));
  });

  useEffect(() => {
    Promise.all([getConversations(), getAssignedDoctors()])
      .then(([convRes, docRes]) => {
        const convs = convRes.data;
        setConversations(convs);
        setDoctors(docRes.data || []);

        // Nếu có convId từ URL (redirect từ ImageDetail) → mở thẳng
        if (autoConvId) {
          const target = convs.find((c) => c.id === parseInt(autoConvId));
          if (target) {
            loadMessages(parseInt(autoConvId));
            return;
          }
        }
        // Mặc định mở conversation đầu tiên
        if (convs.length > 0) {
          loadMessages(convs[0].id);
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

    // Cập nhật locally: Đã đọc tin nhắn -> UnreadCount = 0
    setConversations(prev => 
      prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c)
    );

    const res = await getMessages(convId).catch(() => ({ data: [] }));
    setMessages(res.data);
  };

  const handleNewConv = async (doctorId, doctorName) => {
    try {
      // 1. Kiểm tra xem đã có conversation với bác sĩ này chưa
      const existingConv = conversations.find((c) =>
        c.participants?.some((p) => p.userId === doctorId)
      );

      if (existingConv) {
        // Nếu có rồi thì nhảy vào luôn, không tạo mới
        loadMessages(existingConv.id);
        setShowDoctors(false);
        return;
      }

      // 2. Nếu chưa có thì tạo mới
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
    const inputEl = document.getElementById("patient-chat-input");
    if (inputEl) inputEl.style.height = "auto";

    setLoading(true);
    try {
      await sendMessage(activeConv, text, null);
      await sendSignalRMessage(text, user?.fullName || "Bệnh nhân", false);
      const res = await getMessages(activeConv);
      setMessages(res.data);
      
      // Refresh danh sách conversation
      const convRes = await getConversations();
      setConversations(convRes.data);
    } catch {
      toast.error("Gửi thất bại");
    } finally {
      setLoading(false);
    }
  };

  const getOtherPerson = (conv) => {
    return conv.participants?.find((p) => p.userId !== user?.id);
  };

  // Lấy tin nhắn GẦN NHẤT có chứa context ca bệnh (để đúng với ca hiện tại)
  const caseContextMsg = [...messages].reverse().find(
    (m) => m.imageId != null
  );

  if (initLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="flex h-[calc(100vh-6.5rem)] bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* ==================== SIDEBAR ==================== */}
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

          <div className="relative mt-3 mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm bác sĩ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-slate-400"
            />
          </div>

          {/* Danh sách bác sĩ để tạo conversation mới */}
          {showDoctors && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2 mb-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Chọn bác sĩ để trò chuyện
                </p>
                <button onClick={() => setShowDoctors(false)}>
                  <X size={14} className="text-slate-400" />
                </button>
              </div>
              {doctors.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">
                  Chưa có bác sĩ nào được phân công
                </p>
              ) : (
                doctors.map((d) => (
                  <button
                    key={d.userId}
                    onClick={() => handleNewConv(d.userId, d.fullName)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white transition text-left border border-transparent hover:border-slate-200"
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

        {/* Danh sách conversations */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center py-10 px-4">
              <MessageSquare size={36} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-400">Chưa có cuộc trò chuyện</p>
              <p className="text-xs text-slate-400 mt-1">
                Nhấn + để bắt đầu chat với bác sĩ
              </p>
            </div>
          ) : (() => {
            const filteredConvs = conversations.filter(c => {
              const other = getOtherPerson(c);
              if (!other) return false;
              const name = other.fullName || "";
              return name.toLowerCase().includes(searchQuery.toLowerCase());
            });

            if (filteredConvs.length === 0) {
              return (
                <div className="text-center py-10 text-slate-400 text-sm">
                  Không tìm thấy bác sĩ nào
                </div>
              );
            }

            return [...filteredConvs]
              .sort((a, b) => {
                const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
                const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
                return timeB - timeA;
              })
              .map((c) => {
              const other = getOtherPerson(c);
              const isActive = activeConv === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => loadMessages(c.id)}
                  className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-200
                    ${isActive
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-slate-50 border border-transparent"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
                        ${isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}
                    >
                      <Stethoscope size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-center pr-2">
                        <p className={`text-sm truncate ${isActive ? "font-bold text-blue-700" : "font-medium text-slate-700"}`}>
                          BS. {other?.fullName || "Bác sĩ"}
                        </p>
                        {c.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center ml-2 flex-shrink-0 shadow-sm">
                            {c.unreadCount > 99 ? '99+' : c.unreadCount}
                          </span>
                        )}
                      </div>
                      {c.lastMessage && (
                        <p className={`text-xs truncate mt-0.5 ${c.unreadCount > 0 ? "font-bold text-slate-700" : "text-slate-400"}`}>
                          {c.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            });
          })()}
        </div>
      </div>

      {/* ==================== KHU VỰC CHAT ==================== */}
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

            {/* Banner context ca bệnh (nếu có tin nhắn 🩻 từ ImageDetail) */}
            {caseContextMsg && (
              <div className="mx-4 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start justify-between gap-4">
                <div className="flex items-start gap-2.5 min-w-0">
                  <FileImage size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-blue-700 mb-0.5">
                      Ca bệnh đang tư vấn
                    </p>
                    <p className="text-xs text-blue-600 line-clamp-2 whitespace-pre-wrap">
                      {caseContextMsg.content.split("\n").slice(1, 3).join(" · ")}
                    </p>
                  </div>
                </div>
                {caseContextMsg.imageId && (
                  <a
                    href={`/patient/images/${caseContextMsg.imageId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-bold rounded-lg transition-colors"
                  >
                    Xem chi tiết
                  </a>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-0.5 bg-[url('https://www.transparenttextures.com/patterns/clean-textile.png')] bg-slate-50/50 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {messages.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                  <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Bắt đầu cuộc trò chuyện</p>
                </div>
              )}
              {messages.map((m, index) => {
                const isMe = m.senderId === user?.id;
                const isAI = m.isAiGenerated;

                const prevM = messages[index - 1];
                const nextM = messages[index + 1];

                const isFirstInGroup = !prevM || prevM.senderId !== m.senderId || prevM.isAiGenerated !== m.isAiGenerated;
                const isLastInGroup = !nextM || nextM.senderId !== m.senderId || nextM.isAiGenerated !== m.isAiGenerated;

                let radiusClass = "rounded-2xl";
                if (isMe) {
                  radiusClass = `rounded-l-2xl ${isFirstInGroup ? "rounded-tr-2xl" : "rounded-tr-md"} ${isLastInGroup ? "rounded-br-2xl" : "rounded-br-md"}`;
                } else {
                  radiusClass = `rounded-r-2xl ${isFirstInGroup ? "rounded-tl-2xl" : "rounded-tl-md"} ${isLastInGroup ? "rounded-bl-2xl" : "rounded-bl-md"}`;
                }

                return (
                  <div
                    key={m.id}
                    className={`flex items-end gap-2.5 ${isMe ? "justify-end" : "justify-start"} ${!isLastInGroup ? "mb-1" : "mb-4"}`}
                  >
                    {/* Avatar bên trái */}
                    {!isMe && (
                      <div className="w-8 flex-shrink-0 flex justify-center">
                        {isLastInGroup ? (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${isAI ? "bg-purple-100" : "bg-teal-100"}`}>
                            {isAI ? <Bot size={15} className="text-purple-600" /> : <Stethoscope size={14} className="text-teal-600" />}
                          </div>
                        ) : <div className="w-8" />}
                      </div>
                    )}

                    <div className={`max-w-[75%] lg:max-w-md ${isMe ? "order-1 flex flex-col items-end" : "flex flex-col items-start"}`}>
                      {/* Tên người gửi */}
                      {!isMe && isFirstInGroup && (
                        <p className={`text-[11px] font-bold mb-1 ml-1 opacity-70 ${isAI ? "text-purple-600" : "text-teal-600"}`}>
                          {isAI ? "AI Assistant" : `BS. ${m.senderName}`}
                        </p>
                      )}

                      {/* Bubble tin nhắn */}
                      <div
                        className={`group relative px-4 py-2.5 text-[15px] leading-relaxed shadow-sm transition-all hover:shadow-md ${
                          isMe
                            ? "bg-gradient-to-tr from-blue-600 to-blue-500 text-white"
                            : isAI
                            ? "bg-white text-slate-700 border border-purple-100"
                            : "bg-white text-slate-800 border border-slate-100"
                        } ${radiusClass}`}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>

                        <div className={`flex items-center gap-1 mt-1 justify-end opacity-70 text-[10px] ${isMe ? "text-blue-100" : "text-slate-400"}`}>
                          <span>
                            {new Date(m.createdAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {isMe && isLastInGroup && (
                            m.isRead ? <CheckCheck size={12} className="text-blue-200" /> : <Check size={12} />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Avatar bên phải (mình) */}
                    {isMe && (
                      <div className="w-8 flex-shrink-0 flex justify-center order-2">
                        {isLastInGroup ? (
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shadow-sm">
                            <User size={15} className="text-blue-600" />
                          </div>
                        ) : <div className="w-8" />}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input gửi tin nhắn */}
            <div className="p-4 border-t border-slate-100 flex items-center gap-3 bg-white shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.1)] relative z-10">
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl flex items-center px-4 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-inner">
                <textarea
                  id="patient-chat-input"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                      e.target.style.height = "auto";
                    }
                  }}
                  placeholder="Soạn tin nhắn cho bác sĩ..."
                  className="flex-1 py-3 bg-transparent text-[15px] focus:outline-none placeholder-slate-400 resize-none max-h-[150px] scrollbar-thin overflow-y-auto leading-relaxed"
                  rows={1}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-all disabled:opacity-50 disabled:scale-95 shadow-md hover:shadow-lg flex-shrink-0"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={18} className="ml-0.5" />
                )}
              </button>
            </div>
          </>
        ) : (
          /* Chưa chọn conversation */
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center">
              <MessageSquare size={36} className="text-slate-300" />
            </div>
            <div className="text-center">
              <p className="font-medium text-slate-500">Chọn cuộc trò chuyện</p>
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
