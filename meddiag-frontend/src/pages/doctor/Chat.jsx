import { useEffect, useState, useRef } from "react";
import { getConversations, getMessages, sendMessage, getAiDraft } from "../../api/chat";
import useAuthStore from "../../store/useAuthStore";
import useSignalR from "../../hooks/useSignalR";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Send,
  MessageSquare,
  Bot,
  User,
  Stethoscope,
  FileImage,
  Archive,
  ArchiveRestore,
  Inbox,
  Paperclip,
  Check,
  CheckCheck,
  Search,
  Sparkles
} from "lucide-react";
import { archiveConversation } from "../../api/chat";

export default function DoctorChat() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const bottomRef = useRef(null);
  const [searchParams] = useSearchParams();
  const initConvId = searchParams.get("convId");
  const [tab, setTab] = useState("inbox"); // 'inbox' | 'archive'
  const [searchTerm, setSearchTerm] = useState("");

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
        senderId: null,
        createdAt: msg.createdAt,
      },
    ]);
    
    // Refresh danh sách conversation để cập nhật LastMessage và Sort lên đầu
    getConversations().then(res => setConversations(res.data));
  });

  useEffect(() => {
    getConversations()
      .then((res) => {
        setConversations(res.data);
        if (initConvId) {
          const exists = res.data.find(c => c.id === Number(initConvId));
          if (exists) loadMessages(Number(initConvId));
        } else if (res.data.length > 0) {
          loadMessages(res.data[0].id);
        }
      })
      .catch(() => {});
  }, [initConvId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async (convId) => {
    setActiveConv(convId);
    
    // Cập nhật locally: Đã đọc tin nhắn -> UnreadCount = 0
    setConversations(prev => 
      prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c)
    );

    const res = await getMessages(convId).catch(() => ({ data: [] }));
    setMessages(res.data);
  };

  const handleSend = async () => {
    if (!input.trim() || !activeConv) return;
    const text = input.trim();
    setInput("");
    const inputEl = document.getElementById("doctor-chat-input");
    if (inputEl) inputEl.style.height = "auto";
    
    setLoading(true);
    try {
      await sendMessage(activeConv, text, null);
      await sendSignalRMessage(text, user?.fullName || "Bác sĩ", false);
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

  const handleAiDraft = async () => {
    if (!activeConv) return;
    setIsDrafting(true);
    try {
      const res = await getAiDraft(activeConv);
      if (res.data && res.data.draft) {
        setInput(res.data.draft);
        toast.success("Đã tải bản nháp AI");
      } else {
        toast.error("AI không thể tạo bản nháp lúc này");
      }
    } catch (error) {
      toast.error("Lỗi khi kết nối với AI");
    } finally {
      setIsDrafting(false);
    }
  };

  const getPatient = (conv) => {
    return conv.participants?.find((p) => p.userId !== user?.id);
  };

  const handleToggleArchive = async (convId, isArchived) => {
    try {
      await archiveConversation(convId, isArchived);
      setConversations(prev => 
        prev.map(c => c.id === convId ? { ...c, isArchived } : c)
      );
      toast.success(isArchived ? "Đã lưu trữ cuộc trò chuyện" : "Đã bỏ lưu trữ");
      if (activeConv === convId) setActiveConv(null);
    } catch (error) {
      toast.error("Thao tác thất bại");
    }
  };

  const filteredConvs = conversations.filter(c => {
    const matchTab = tab === "inbox" ? !c.isArchived : c.isArchived;
    const patientName = getPatient(c)?.fullName?.toLowerCase() || "";
    const matchSearch = patientName.includes(searchTerm.toLowerCase());
    return matchTab && matchSearch;
  });

  // Lấy tin nhắn GẦN NHẤT có chứa context ca bệnh (để đúng với ca hiện tại)
  const caseContextMsg = [...messages].reverse().find(
    (m) => m.imageId != null
  );

  return (
    <div className="flex h-[calc(100vh-6.5rem)] bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-slate-100 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-100">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-800 text-sm">Tin nhắn</h3>
          </div>
          
          {/* Search Bar */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm bệnh nhân..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 text-sm text-slate-700 pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
            />
          </div>

          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setTab("inbox")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                tab === "inbox" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Inbox size={14} /> Hộp thư
            </button>
            <button
              onClick={() => setTab("archive")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                tab === "archive" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Archive size={14} /> Lưu trữ
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConvs.length === 0 ? (
            <div className="text-center py-10 px-4">
              <MessageSquare
                size={36}
                className="mx-auto mb-3 text-slate-300"
              />
              <p className="text-sm text-slate-400">
                Chưa có cuộc trò chuyện
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {tab === "inbox" ? "Bệnh nhân sẽ liên hệ khi cần tư vấn" : "Chưa có cuộc trò chuyện nào được lưu trữ"}
              </p>
            </div>
          ) : (
            filteredConvs.map((c) => {
              const patient = getPatient(c);
              const isActive = activeConv === c.id;
              return (
                <div key={c.id} className={`group relative w-full text-left px-3 py-3 rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-3
                    ${isActive ? "bg-teal-50 border border-teal-200" : "hover:bg-slate-50 border border-transparent"}`}
                    onClick={() => loadMessages(c.id)}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isActive ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"}`}
                  >
                    <User size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-center pr-6">
                      <p
                        className={`text-sm truncate ${isActive ? "font-bold text-teal-700" : "font-medium text-slate-700"}`}
                      >
                        {patient?.fullName || "Bệnh nhân"}
                      </p>
                      {c.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center ml-2 flex-shrink-0">
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleArchive(c.id, !c.isArchived);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-all bg-white shadow-sm"
                    title={c.isArchived ? "Bỏ lưu trữ" : "Lưu trữ"}
                  >
                    {c.isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                  </button>
                </div>
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
              const patient = conv ? getPatient(conv) : null;
              return (
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                  <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
                    <User size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">
                      {patient?.fullName || "Bệnh nhân"}
                    </p>
                    <p className="text-xs text-slate-400">Bệnh nhân</p>
                  </div>
                  {/* Nút thao tác nhanh trên header */}
                  <div className="ml-auto">
                    <button
                      onClick={() => handleToggleArchive(conv.id, !conv.isArchived)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                      title={conv.isArchived ? "Bỏ lưu trữ" : "Lưu trữ"}
                    >
                      {conv.isArchived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Banner context ca bệnh (nếu có tin nhắn 🩻) */}
            {caseContextMsg && (
              <div className="mx-4 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start justify-between gap-4">
                <div className="flex items-start gap-2.5 min-w-0">
                  <FileImage size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-blue-700 mb-0.5">
                      Ca bệnh đang được yêu cầu tư vấn
                    </p>
                    <p className="text-xs text-blue-600 line-clamp-2 whitespace-pre-wrap">
                      {caseContextMsg.content.split("\n").slice(1, 3).join(" · ")}
                    </p>
                  </div>
                </div>
                {caseContextMsg.imageId && (
                  <a
                    href={`/doctor/cases/${caseContextMsg.imageId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-bold rounded-lg transition-colors"
                  >
                    Mở ca bệnh
                  </a>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-0.5 bg-[url('https://www.transparenttextures.com/patterns/clean-textile.png')] bg-slate-50/50 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {messages.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                  <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Chưa có tin nhắn nào</p>
                </div>
              )}
              {messages.map((m, index) => {
                const isMe = m.senderId === user?.id;
                const isAI = m.isAiGenerated;
                
                const prevM = messages[index - 1];
                const nextM = messages[index + 1];
                
                const isFirstInGroup = !prevM || prevM.senderId !== m.senderId || prevM.isAiGenerated !== m.isAiGenerated;
                const isLastInGroup = !nextM || nextM.senderId !== m.senderId || nextM.isAiGenerated !== m.isAiGenerated;
                
                // Tính toán bo góc cho bong bóng chat
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
                    {/* Avatar bên trái cho bệnh nhân / AI */}
                    {!isMe && (
                      <div className="w-8 flex-shrink-0 flex justify-center">
                        {isLastInGroup ? (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isAI ? "bg-purple-100 shadow-sm" : "bg-blue-100 shadow-sm"}`}>
                            {isAI ? <Bot size={15} className="text-purple-600" /> : <User size={14} className="text-blue-600" />}
                          </div>
                        ) : <div className="w-8" />}
                      </div>
                    )}

                    <div className={`max-w-[75%] lg:max-w-md ${isMe ? "order-1 flex flex-col items-end" : "flex flex-col items-start"}`}>
                      {/* Tên người gửi (chỉ hiện ở tin nhắn đầu tiên của nhóm nếu không phải mình) */}
                      {!isMe && isFirstInGroup && (
                        <p className={`text-[11px] font-bold mb-1 ml-1 opacity-70 ${isAI ? "text-purple-600" : "text-slate-500"}`}>
                          {isAI ? "AI Assistant" : m.senderName}
                        </p>
                      )}

                      {/* Bubble */}
                      <div
                        className={`group relative px-4 py-2.5 text-[15px] leading-relaxed shadow-sm transition-all hover:shadow-md
                          ${
                            isMe
                              ? "bg-gradient-to-tr from-teal-600 to-teal-500 text-white"
                              : isAI
                                ? "bg-white text-slate-700 border border-purple-100"
                                : "bg-white text-slate-800 border border-slate-100"
                          } ${radiusClass}`}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        
                        <div className={`flex items-center gap-1 mt-1 justify-end opacity-70 text-[10px] ${isMe ? "text-teal-100" : "text-slate-400"}`}>
                          <span>
                            {new Date(m.createdAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {isMe && isLastInGroup && (
                            m.isRead ? <CheckCheck size={12} className="text-blue-200" /> : <Check size={12} />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Avatar bên phải cho bác sĩ (chỉ hiện ở tin cuối) */}
                    {isMe && (
                      <div className="w-8 flex-shrink-0 flex justify-center order-2">
                        {isLastInGroup ? (
                          <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center shadow-sm">
                            <Stethoscope size={14} className="text-teal-600" />
                          </div>
                        ) : <div className="w-8" />}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input VIP */}
            <div className="p-4 border-t border-slate-100 flex items-center gap-3 bg-white shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.1)] relative z-10">
              <button className="p-2.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-colors flex-shrink-0">
                <Paperclip size={20} />
              </button>
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl flex items-center px-4 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all shadow-inner">
                <textarea
                  id="doctor-chat-input"
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
                  placeholder="Soạn tin nhắn..."
                  className="flex-1 py-3 bg-transparent text-[15px] focus:outline-none placeholder-slate-400 resize-none max-h-[150px] scrollbar-thin overflow-y-auto leading-relaxed"
                  rows={1}
                />
                
                {/* Nút AI Draft */}
                <button
                  onClick={handleAiDraft}
                  disabled={isDrafting || loading}
                  className="p-1.5 ml-2 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-1.5 font-medium text-xs disabled:opacity-50"
                  title="Gợi ý trả lời từ AI"
                >
                  {isDrafting ? (
                    <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span className="hidden sm:inline">Gợi ý AI</span>
                    </>
                  )}
                </button>
              </div>
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center hover:bg-teal-700 transition-all disabled:opacity-50 disabled:scale-95 shadow-md hover:shadow-lg flex-shrink-0"
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
                Chọn bệnh nhân từ danh sách bên trái
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
