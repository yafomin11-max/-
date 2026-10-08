import { useState, useEffect, useRef, useCallback } from "react";
import { ref, onValue, off, push, set, remove, update } from "firebase/database";
import { auth, db } from "../firebase";
import { Message, Chat, User, ThemeMode, getAvatarColor, getInitials, formatTime, formatDuration, formatFileSize, formatCallDuration, fileToBase64, compressImage, REACTION_EMOJIS, MEDIA_EXPIRY_MS, playNotifSound, showBrowserNotification, playSendSound, playReceiveSound, URL_REGEX } from "../types";
import CallModal from "./CallModal";

interface ChatViewProps { chatId: string | null; onBack: () => void; theme: ThemeMode; }
const dk = (t: ThemeMode, l: string, d: string) => t === "dark" ? d : l;

const EMOJI_CATEGORIES: Record<string, string[]> = {
  "Смайлы": ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🫡","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐"],
  "Жесты": ["👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏"],
  "Сердца": ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","❤️‍🔥","💔","❣️","💕","💞","💓","💗","💖","💘","💝"],
  "Природа": ["🌸","🌺","🌻","🌹","🌷","🌱","🌿","🍀","🍁","🍂","🍃","🌾","🌵","🌴","🌲","🎄","🌳","🍄","🌊","💧","🔥","⭐","✨","💫","🌈","☀️","🌤️","🌧️","❄️","☃️","🌙","🌝","🌞"],
};

export default function ChatView({ chatId, onBack, theme }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatInfo, setChatInfo] = useState<Chat | null>(null);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: Message } | null>(null);
  const [reactionPicker, setReactionPicker] = useState<{ x: number; y: number; msgId: string } | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchInChat, setSearchInChat] = useState("");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
  const [photoViewer, setPhotoViewer] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Call state
  const [activeCall, setActiveCall] = useState<{otherUserId: string; otherUserName: string; otherUserPhoto: string; isOutgoing: boolean; callType: "voice" | "video"} | null>(null);
  // Incoming call state (detected from Firebase)
  const [_incomingCall, _setIncomingCall] = useState<{callId: string; callerId: string; callerName: string; callType: "voice" | "video"} | null>(null);
  // Long press state
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // CRITICAL FIX: use a ref for recording duration so onstop reads current value
  // @ts-expect-error recordingDurationRef may be unused due to refactoring
  const recordingDurationRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const notifTimesRef = useRef<Record<string, number>>({});
  const currentUser = auth.currentUser;

  // Toast
  const showToast = (text: string) => { setToast(text); setTimeout(() => setToast(null), 2000); };

  // Request notification permission
  useEffect(() => {
    const h = () => { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); document.removeEventListener("click", h); };
    document.addEventListener("click", h); return () => document.removeEventListener("click", h);
  }, []);

  // Fix keyboard covering input on mobile - scroll to bottom when keyboard opens
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      // When viewport shrinks (keyboard opens), scroll messages to bottom and adjust layout
      if (vv.height < window.innerHeight) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        // Push the input area above keyboard
        const container = document.getElementById("chat-input-area");
        if (container) {
          container.style.transform = `translateY(${vv.offsetTop - window.innerHeight + vv.height}px)`;
        }
      } else {
        const container = document.getElementById("chat-input-area");
        if (container) container.style.transform = "";
      }
    };
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  // Load users
  useEffect(() => { const r = ref(db, "users"); onValue(r, (s) => { if (s.val()) setUsers(s.val()); }); return () => off(r); }, []);
  // Load chat info
  useEffect(() => { if (!chatId) { setChatInfo(null); return; } const r = ref(db, `chats/${chatId}`); onValue(r, (s) => { if (s.val()) setChatInfo({ ...s.val(), id: chatId }); }); return () => off(r); }, [chatId]);
  // Load messages
  useEffect(() => {
    if (!chatId) { setMessages([]); return; }
    const r = ref(db, `messages/${chatId}`);
    onValue(r, (s) => {
      const d = s.val();
      if (d) {
        const msgs: Message[] = Object.entries(d).map(([k, v]: [string, unknown]) => ({ id: k, ...(v as Omit<Message, "id">) }));
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(msgs);
        const pinned = msgs.filter((m) => m.pinned && !m.deleted);
        setPinnedMessage(pinned.length > 0 ? pinned[pinned.length - 1] : null);
      } else { setMessages([]); setPinnedMessage(null); }
    });
    return () => off(r);
  }, [chatId]);

  // Typing indicator
  useEffect(() => { if (!chatId || !currentUser) return; onValue(ref(db, `chats/${chatId}/typingUsers`), (s) => { const d = s.val(); setIsTyping(d ? Object.keys(d).filter((uid) => uid !== currentUser.uid && Date.now() - d[uid] < 5000).length > 0 : false); }); return () => off(ref(db, `chats/${chatId}/typingUsers`)); }, [chatId, currentUser]);

  // Per-chat notification
  useEffect(() => {
    if (!chatId || !currentUser) return;
    onValue(ref(db, `chats/${chatId}`), (s) => {
      const d = s.val(); if (!d) return;
      const lt = d.lastMessageTime || 0, pt = notifTimesRef.current[chatId] || 0;
      if (pt > 0 && lt > pt && d.lastMessageSender !== currentUser.uid && document.hidden) {
        playNotifSound(); showBrowserNotification(d.participantNames?.[d.lastMessageSender] || "Пользователь", d.lastMessage || "Сообщение");
      }
      notifTimesRef.current[chatId] = lt;
    });
    return () => off(ref(db, `chats/${chatId}`));
  }, [chatId, currentUser]);

  // Auto-scroll
  useEffect(() => { if (!showScrollBtn) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, showScrollBtn]);
  const handleScroll = useCallback(() => { const el = chatContainerRef.current; if (el) setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200); }, []);

  // Typing write
  useEffect(() => { if (!chatId || !currentUser) return; if (newMessage.length > 0) set(ref(db, `chats/${chatId}/typingUsers/${currentUser.uid}`), Date.now()); else remove(ref(db, `chats/${chatId}/typingUsers/${currentUser.uid}`)); }, [newMessage, chatId, currentUser]);

  // Mark as read + play receive sound
  useEffect(() => {
    if (!chatId || !currentUser || messages.length === 0) return;
    const unread = messages.filter((m) => m.senderId !== currentUser.uid && !m.read);
    if (unread.length > 0) {
      unread.forEach((m) => update(ref(db, `messages/${chatId}/${m.id}`), { read: true }));
      update(ref(db, `chats/${chatId}`), { unreadCount: 0 });
      // Play receive sound only for the latest unread message
      if (!document.hidden) playReceiveSound();
    }
  }, [messages, chatId, currentUser]);

  // Send text
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || !chatId || !currentUser) return;
    setNewMessage("");
    await remove(ref(db, `chats/${chatId}/typingUsers/${currentUser.uid}`));
    if (editingMessage) {
      await update(ref(db, `messages/${chatId}/${editingMessage.id}`), { text, edited: true });
      setEditingMessage(null);
    } else {
      await set(push(ref(db, `messages/${chatId}`)), {
        senderId: currentUser.uid, senderName: currentUser.displayName || "Пользователь",
        text, timestamp: Date.now(), read: false,
        replyTo: replyTo?.id || null, replyToText: replyTo?.text?.slice(0, 80) || null, replyToName: replyTo?.senderName || null,
        edited: false, deleted: false, messageType: "text",
      });
    }
    await update(ref(db, `chats/${chatId}`), { lastMessage: text.length > 50 ? text.slice(0, 50) + "..." : text, lastMessageTime: Date.now(), lastMessageSender: currentUser.uid, lastMessageType: "text" });
    playSendSound();
    setReplyTo(null); inputRef.current?.focus();
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mr; audioChunksRef.current = []; setRecordingDuration(0);
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        const dur = recordingDuration;
        if (dur < 0.5) { setIsRecording(false); setRecordingDuration(0); return; }
        const reader = new FileReader();
        reader.onloadend = async () => {
          const b64 = reader.result as string;
          if (!chatId || !currentUser) return;
          setIsRecording(false); setRecordingDuration(0);
          await set(push(ref(db, `messages/${chatId}`)), {
            senderId: currentUser.uid, senderName: currentUser.displayName || "Пользователь",
            text: "🎤 Голосовое сообщение", timestamp: Date.now(), read: false,
            replyTo: replyTo?.id || null, replyToText: replyTo?.text?.slice(0, 80) || null, replyToName: replyTo?.senderName || null,
            messageType: "voice", voiceDuration: dur, voiceUrl: b64,
            mediaExpiresAt: Date.now() + MEDIA_EXPIRY_MS,
          });
          await update(ref(db, `chats/${chatId}`), { lastMessage: "🎤 Голосовое сообщение", lastMessageTime: Date.now(), lastMessageSender: currentUser.uid, lastMessageType: "voice" });
          playSendSound();
          setReplyTo(null);
        };
        reader.readAsDataURL(blob);
      };
      mr.start(); setIsRecording(true);
      recordingTimerRef.current = setInterval(() => setRecordingDuration((p) => p + 1), 1000);
    } catch { alert("Разрешите доступ к микрофону"); }
  };
  const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); if (recordingTimerRef.current) clearInterval(recordingTimerRef.current); } };
  const cancelRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.ondataavailable = null; mediaRecorderRef.current.onstop = null; mediaRecorderRef.current.stop(); if (recordingTimerRef.current) clearInterval(recordingTimerRef.current); setIsRecording(false); setRecordingDuration(0); audioChunksRef.current = []; } };

  // File sending
  const sendFile = async (file: File, type: "file" | "image" | "video") => {
    if (!chatId || !currentUser) return;
    if (file.size > 10 * 1024 * 1024) { alert("Файл слишком большой (макс. 10 МБ)"); return; }
    setIsUploading(true);
    try {
      let b64 = type === "image" ? await compressImage(file, 1200, 0.8) : await fileToBase64(file);
      const isImage = type === "image" || file.type.startsWith("image/");
      const isVideo = type === "video" || file.type.startsWith("video/");
      const actualType = isImage ? "image" : isVideo ? "video" : "file";
      let thumb = isImage ? await compressImage(file, 300, 0.5) : "";
      await set(push(ref(db, `messages/${chatId}`)), {
        senderId: currentUser.uid, senderName: currentUser.displayName || "Пользователь",
        text: isImage ? `🖼️ ${file.name}` : isVideo ? `🎬 ${file.name}` : `📎 ${file.name}`,
        timestamp: Date.now(), read: false,
        replyTo: replyTo?.id || null, replyToText: replyTo?.text?.slice(0, 80) || null, replyToName: replyTo?.senderName || null,
        messageType: actualType, fileName: file.name, fileSize: file.size, fileUrl: b64,
        fileMimeType: file.type, thumbnailUrl: thumb || undefined,
        mediaExpiresAt: Date.now() + MEDIA_EXPIRY_MS,
      });
      const preview = isImage ? "🖼️ Фото" : isVideo ? "🎬 Видео" : `📎 ${file.name.slice(0, 30)}`;
      await update(ref(db, `chats/${chatId}`), { lastMessage: preview, lastMessageTime: Date.now(), lastMessageSender: currentUser.uid, lastMessageType: actualType });
      playSendSound();
      setReplyTo(null);
    } catch { alert("Ошибка отправки файла"); }
    setIsUploading(false);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "file" | "image" | "video") => { if (e.target.files?.[0]) sendFile(e.target.files[0], type); e.target.value = ""; };

  // Delete message
  const deleteMessage = async (msg: Message) => { if (!chatId) return; if (msg.senderId === currentUser?.uid) { await update(ref(db, `messages/${chatId}/${msg.id}`), { deleted: true, text: "Сообщение удалено", voiceUrl: null, fileUrl: null, thumbnailUrl: null }); } else { await remove(ref(db, `messages/${chatId}/${msg.id}`)); } setContextMenu(null); };

  // Delete media from server (user action)
  const deleteMediaFromServer = async (msg: Message) => {
    if (!chatId) return;
    await update(ref(db, `messages/${chatId}/${msg.id}`), {
      mediaDeleted: true, fileUrl: null, thumbnailUrl: null, voiceUrl: null,
      text: "⏰ Медиафайл удалён вручную",
    });
    setContextMenu(null);
    showToast("Медиафайл удалён с сервера");
  };

  // Pin message
  const pinMessage = async (msg: Message) => { if (!chatId) return; const pinnedMsgs = messages.filter((m) => m.pinned && !m.deleted); for (const pm of pinnedMsgs) await update(ref(db, `messages/${chatId}/${pm.id}`), { pinned: false }); await update(ref(db, `messages/${chatId}/${msg.id}`), { pinned: !msg.pinned }); setContextMenu(null); };

  // Edit message
  const startEdit = (msg: Message) => { if (msg.messageType !== "text") { setContextMenu(null); return; } setEditingMessage(msg); setNewMessage(msg.text); setContextMenu(null); inputRef.current?.focus(); };

  // Forward
  const startForward = (msg: Message) => { setForwardMsg(msg); setContextMenu(null); };
  const executeForward = async (targetChatId: string) => {
    if (!forwardMsg || !currentUser) return;
    await set(push(ref(db, `messages/${targetChatId}`)), {
      senderId: currentUser.uid, senderName: currentUser.displayName || "Пользователь",
      text: forwardMsg.text, timestamp: Date.now(), read: false,
      messageType: forwardMsg.messageType || "text", forwardedFrom: forwardMsg.senderName,
      voiceUrl: forwardMsg.voiceUrl, voiceDuration: forwardMsg.voiceDuration,
      fileUrl: forwardMsg.fileUrl, fileName: forwardMsg.fileName, fileSize: forwardMsg.fileSize,
      fileMimeType: forwardMsg.fileMimeType, thumbnailUrl: forwardMsg.thumbnailUrl,
    });
    await update(ref(db, `chats/${targetChatId}`), { lastMessage: forwardMsg.text?.slice(0, 50) || "Сообщение", lastMessageTime: Date.now(), lastMessageSender: currentUser.uid });
    setForwardMsg(null);
  };

  // Toggle reaction
  const toggleReaction = async (msgId: string, emoji: string) => { if (!chatId || !currentUser) return; const msgRef = ref(db, `messages/${chatId}/${msgId}/reactions/${emoji}/${currentUser.uid}`); const msg = messages.find((m) => m.id === msgId); if (msg?.reactions?.[emoji]?.[currentUser.uid]) await remove(msgRef); else await set(msgRef, true); setReactionPicker(null); };

  // Download file
  const downloadFile = (msg: Message) => { if (!msg.fileUrl) return; const a = document.createElement("a"); a.href = msg.fileUrl; a.download = msg.fileName || "file"; a.click(); };

  // Download photo to gallery
  const downloadPhoto = (url: string, name?: string) => {
    const a = document.createElement("a"); a.href = url; a.download = name || "photo.jpg"; a.click();
    showToast("Фото сохранено");
  };

  // Copy message text
  const copyMessage = (msg: Message) => {
    if (msg.text && !msg.deleted) { navigator.clipboard.writeText(msg.text); showToast("Скопировано"); }
  };

  // Start call
  const startCall = (callType: "voice" | "video") => {
    if (!chatInfo || chatInfo.savedMessages) return;
    const otherUid = Object.keys(chatInfo.participants).find((u) => u !== currentUser?.uid);
    if (!otherUid) return;
    const otherUser = users[otherUid];
    setActiveCall({
      otherUserId: otherUid,
      otherUserName: otherUser?.displayName || "Пользователь",
      otherUserPhoto: otherUser?.photoURL || "",
      isOutgoing: true,
      callType,
    });
  };

  // Star message
  const toggleStar = async (msg: Message) => {
    if (!chatId) return;
    await update(ref(db, `messages/${chatId}/${msg.id}`), { starred: !msg.starred });
    setContextMenu(null);
    showToast(msg.starred ? "Убрано из избранного" : "Добавлено в избранное");
  };

  // Linkify text - make URLs clickable
  const linkifyText = (text: string): React.ReactNode => {
    const parts = text.split(URL_REGEX);
    return parts.map((part, i) => {
      if (URL_REGEX.test(part)) {
        const href = part.startsWith("www.") ? "https://" + part : part;
        return <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-[#3390ec] underline hover:no-underline" onClick={(e) => e.stopPropagation()}>{part}</a>;
      }
      return part;
    });
  };

  // Long press handlers for mobile
  const handleTouchStart = (msg: Message) => {
    longPressFiredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      if (!msg.deleted) {
        // For own messages, show edit/delete; for others, show reply/forward
        setContextMenu({ x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 150, msg });
      }
    }, 500);
  };
  const handleTouchEnd = () => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); };
  const handleTouchMove = () => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); };

  // Click on message
  const handleMessageClick = (msg: Message) => {
    if (longPressFiredRef.current) { longPressFiredRef.current = false; return; }
    if (msg.deleted) return;
    if (msg.messageType === "image" && msg.thumbnailUrl) {
      setPhotoViewer(msg.fileUrl || msg.thumbnailUrl);
    } else if (msg.messageType === "voice" || msg.messageType === "file" || msg.messageType === "video") {
      // no-op for these types
    } else {
      copyMessage(msg);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, msg: Message) => { e.preventDefault(); if (!msg.deleted) setContextMenu({ x: e.clientX, y: e.clientY, msg }); };

  const getChatName = (): string => {
    if (!chatInfo) return "";
    if (chatInfo.savedMessages) return "Избранное";
    if (chatInfo.type === "group") return chatInfo.name || "Группа";
    const uid = Object.keys(chatInfo.participants).find((u) => u !== currentUser?.uid);
    if (uid && users[uid]) return users[uid].displayName || users[uid].username || "Удалённый аккаунт";
    return "Удалённый аккаунт";
  };
  const getOtherUserOnline = () => { if (!chatInfo || chatInfo.type !== "private" || chatInfo.savedMessages) return false; const uid = Object.keys(chatInfo.participants).find((u) => u !== currentUser?.uid); return uid ? users[uid]?.online || false : false; };
  const getOtherUserLastSeen = () => { if (!chatInfo || chatInfo.type !== "private" || chatInfo.savedMessages) return ""; const uid = Object.keys(chatInfo.participants).find((u) => u !== currentUser?.uid); if (uid && users[uid]) { const u = users[uid]; if (u.online) return "В сети"; const d = Date.now() - u.lastSeen; if (d < 60000) return "был(а) только что"; if (d < 3600000) return `был(а) ${Math.floor(d / 60000)} мин. назад`; if (d < 86400000) return `был(а) ${Math.floor(d / 3600000)} ч. назад`; return `был(а) ${new Date(u.lastSeen).toLocaleDateString("ru")}`; } return ""; };

  const shouldShowDate = (msgs: Message[], i: number) => { if (i === 0) return true; return new Date(msgs[i - 1].timestamp).toDateString() !== new Date(msgs[i].timestamp).toDateString(); };
  const formatDateSep = (ts: number) => { const d = new Date(ts), now = new Date(); if (d.toDateString() === now.toDateString()) return "Сегодня"; const y = new Date(now); y.setDate(y.getDate() - 1); if (d.toDateString() === y.toDateString()) return "Вчера"; return d.toLocaleDateString("ru", { day: "numeric", month: "long" }); };
  const isConsecutive = (msgs: Message[], i: number) => { if (i === 0) return false; return msgs[i].senderId === msgs[i - 1].senderId && msgs[i].timestamp - msgs[i - 1].timestamp < 300000 && !shouldShowDate(msgs, i); };

  const renderContent = (msg: Message, isOwn: boolean) => {
    if (msg.deleted) return <span className="italic text-[#999]">🚫 Сообщение удалено</span>;
    if (msg.mediaDeleted) return <span className="italic text-[#999]">⏰ Медиафайл удалён (истёк срок)</span>;
    const parts: React.ReactNode[] = [];
    if (msg.forwardedFrom) parts.push(<div key="fwd" className="text-[12px] text-[#3390ec] font-medium mb-1">Переслано от {msg.forwardedFrom}</div>);
    if (msg.messageType === "voice" && msg.voiceUrl) {
      parts.push(<div key="v" className="flex items-center gap-2 min-w-[200px] py-1"><div className={`w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0 ${isOwn ? (theme==="dark"?"bg-[#5eba5f]":"bg-[#5eba5f]") : "bg-[#3390ec]"}`}><svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg></div><div className="flex-1"><audio controls src={msg.voiceUrl} className="w-full h-8" preload="none" /><div className="text-[10px] text-[#999]">{formatDuration(msg.voiceDuration || 0)}</div></div></div>);
    } else if (msg.messageType === "image" && msg.thumbnailUrl) {
      parts.push(<div key="img" className="mb-1 relative"><img src={msg.thumbnailUrl} alt="" className="max-w-[280px] max-h-[280px] rounded-lg cursor-pointer object-cover" loading="lazy" /><div className="absolute bottom-2 right-2 bg-black/50 rounded-full p-1.5"><svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg></div></div>);
    } else if (msg.messageType === "video" && msg.fileUrl) {
      parts.push(<div key="vid" className="mb-1"><video controls className="max-w-[280px] max-h-[280px] rounded-lg" preload="metadata"><source src={msg.fileUrl} type={msg.fileMimeType || "video/mp4"} /></video></div>);
    } else if (msg.messageType === "file" && msg.fileUrl) {
      parts.push(<div key="file" className="flex items-center gap-3 py-1 min-w-[200px]"><div className={`w-[42px] h-[42px] rounded-xl flex items-center justify-center flex-shrink-0 ${isOwn ? "bg-[#5eba5f]" : "bg-[#3390ec]"}`}><svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg></div><div className="flex-1 min-w-0"><p className={`text-[13px] truncate font-medium ${dk(theme,"text-[#222]","text-white")}`}>{msg.fileName || "Файл"}</p><p className="text-[11px] text-[#999]">{formatFileSize(msg.fileSize || 0)}</p></div><button onClick={(e) => { e.stopPropagation(); downloadFile(msg); }} className="p-1.5 rounded-full hover:bg-black/5"><svg className="w-5 h-5 text-[#3390ec]" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg></button></div>);
    } else if (msg.messageType === "call") {
      const isVideo = msg.callType === "video";
      const isMissed = msg.callStatus === "missed";
      parts.push(
        <div key="call" className="flex items-center gap-2 py-1">
          <div className={`w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0 ${isMissed ? "bg-red-500/20" : "bg-green-500/20"}`}>
            {isVideo ? (
              <svg className={`w-5 h-5 ${isMissed ? "text-red-500" : "text-green-500"}`} viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
            ) : (
              <svg className={`w-5 h-5 ${isMissed ? "text-red-500" : "text-green-500"}`} viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
            )}
          </div>
          <div>
            <span className={`text-[13px] font-medium ${isMissed ? "text-red-500" : "text-green-500"}`}>
              {isMissed ? "Пропущенный звонок" : msg.callStatus === "declined" ? "Отклонённый звонок" : isVideo ? "Видеозвонок" : "Голосовой звонок"}
            </span>
            {msg.callDuration && msg.callDuration > 0 && (
              <span className="text-[11px] text-[#999] ml-2">{formatCallDuration(msg.callDuration)}</span>
            )}
          </div>
        </div>
      );
    }
    const showText = msg.text && msg.messageType !== "voice" && !(msg.messageType === "image" && msg.text === `🖼️ ${msg.fileName}`) && !(msg.messageType === "file" && msg.text === `📎 ${msg.fileName}`) && !(msg.messageType === "video" && msg.text === `🎬 ${msg.fileName}`);
    if (showText) parts.push(<span key="t" className={`text-[14.5px] leading-[1.35] break-words whitespace-pre-wrap ${dk(theme,"text-[#222]","text-white")}`}>{linkifyText(msg.text)}</span>);
    return parts.length > 0 ? <>{parts}</> : null;
  };

  // Empty state
  if (!chatId) {
    return (
      <div className={`flex-1 flex items-center justify-center relative overflow-hidden ${dk(theme,"bg-[#8ba0b5]","bg-[#0e1621]")}`}>
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23000'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
        <div className="text-center z-10">
          <svg width="200" height="200" viewBox="0 0 240 240" className="mx-auto mb-6 opacity-20"><defs><linearGradient id="gE" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3390ec"/><stop offset="100%" stopColor="#6c5ce7"/></linearGradient></defs><rect width="240" height="240" rx="120" fill="url(#gE)"/><path d="M85 70L175 70 155 170 65 170Z" fill="white" opacity=".9"/><path d="M95 170L75 195 110 170" fill="white" opacity=".9"/></svg>
          <h2 className={`text-lg drop-shadow ${dk(theme,"text-white","text-gray-300")}`}>Выберите чат для начала общения</h2>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col h-full relative ${dk(theme,"","bg-[#0e1621]")}`}>
      {/* Header */}
      <div className={`flex items-center px-4 py-[7px] border-b flex-shrink-0 z-10 ${dk(theme,"bg-white border-[#e0e0e0]","bg-[#17212b] border-[#1e2c3a]")}`}>
        <button onClick={onBack} className="md:hidden p-1 mr-2 text-[#707579] hover:text-[#3390ec]"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            {(() => { const oUid = Object.keys(chatInfo?.participants || {}).find((u) => u !== currentUser?.uid); const ph = oUid ? users[oUid]?.photoURL : ""; return chatInfo?.savedMessages ? <div className="w-[42px] h-[42px] rounded-full bg-[#3390ec] flex items-center justify-center text-white"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg></div> : ph ? <img src={ph} className="w-[42px] h-[42px] rounded-full object-cover" /> : <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-white font-medium text-[16px]" style={{ backgroundColor: getAvatarColor(oUid || "d") }}>{getInitials(getChatName())}</div>; })()}
            {getOtherUserOnline() && <div className="absolute bottom-0 right-0 w-[12px] h-[12px] bg-[#4dcd5e] rounded-full border-2 border-white" />}
          </div>
          <div className="min-w-0">
            <h3 className={`text-[15px] font-semibold truncate ${dk(theme,"text-[#222]","text-white")}`}>{getChatName()}</h3>
            <p className={`text-xs ${isTyping ? "text-[#3390ec]" : getOtherUserOnline() ? "text-[#3390ec]" : "text-[#707579]"}`}>{isTyping ? "печатает..." : getOtherUserOnline() ? "В сети" : getOtherUserLastSeen()}</p>
          </div>
        </div>
        <button onClick={() => setShowSearch(!showSearch)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-[#707579]"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg></button>
        {/* Call buttons - only for private chats */}
        {!chatInfo?.savedMessages && chatInfo?.type === "private" && (
          <>
            <button onClick={() => startCall("voice")} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-[#707579]"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg></button>
            <button onClick={() => startCall("video")} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-[#707579]"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg></button>
          </>
        )}
      </div>

      {/* Pinned */}
      {pinnedMessage && (
        <div className={`px-4 py-2 border-b flex items-center gap-2 cursor-pointer flex-shrink-0 ${dk(theme,"bg-white border-[#e0e0e0] hover:bg-[#f4f4f5]","bg-[#17212b] border-[#1e2c3a] hover:bg-[#1e2c3a]")}`} onClick={() => { const el = document.getElementById(`msg-${pinnedMessage.id}`); el?.scrollIntoView({ behavior: "smooth", block: "center" }); el?.classList.add("bg-yellow-100","dark:bg-yellow-900/30"); setTimeout(() => { el?.classList.remove("bg-yellow-100","dark:bg-yellow-900/30"); }, 2000); }}>
          <svg className="w-4 h-4 text-[#3390ec] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
          <div className="flex-1 min-w-0"><p className="text-[12px] text-[#3390ec] font-medium">{pinnedMessage.senderName}</p><p className={`text-[13px] truncate ${dk(theme,"text-[#707579]","text-gray-400")}`}>{pinnedMessage.text}</p></div>
          <button onClick={(e) => { e.stopPropagation(); pinMessage(pinnedMessage); }} className="text-[#999] hover:text-[#222]"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
        </div>
      )}

      {/* Search */}
      {showSearch && (
        <div className={`px-4 py-2 border-b flex items-center gap-2 flex-shrink-0 ${dk(theme,"bg-white border-[#e0e0e0]","bg-[#17212b] border-[#1e2c3a]")}`}>
          <svg className="w-5 h-5 text-[#a2acb4] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          <input value={searchInChat} onChange={(e) => setSearchInChat(e.target.value)} placeholder="Поиск в чате" className={`flex-1 text-sm placeholder-[#a2acb4] focus:outline-none ${dk(theme,"text-[#222]","text-white")}`} autoFocus />
          <button onClick={() => { setShowSearch(false); setSearchInChat(""); }} className="text-[#707579] hover:text-[#222]"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
        </div>
      )}

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto px-4 py-2 relative ${dk(theme,"bg-[#8ba0b5]","bg-[#0e1621]")}`} ref={chatContainerRef} onScroll={handleScroll}>
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23000'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
        <div className="relative z-10">
          {messages.map((msg, i) => {
            const isOwn = msg.senderId === currentUser?.uid;
            const showDate = shouldShowDate(messages, i);
            const consec = isConsecutive(messages, i);
            if (searchInChat && !msg.text?.toLowerCase().includes(searchInChat.toLowerCase())) return null;
            const reactionEntries = msg.reactions ? Object.entries(msg.reactions).filter(([, uids]) => Object.keys(uids).length > 0) : [];
            const hasMedia = msg.messageType && msg.messageType !== "text" && (msg.fileUrl || msg.voiceUrl || msg.thumbnailUrl);
            return (
              <div key={msg.id} id={`msg-${msg.id}`}>
                {showDate && <div className="flex justify-center my-3"><span className="bg-black/20 text-white text-[13px] px-3 py-1 rounded-full backdrop-blur-sm">{formatDateSep(msg.timestamp)}</span></div>}
                <div className={`flex ${consec ? "mt-[2px]" : "mt-[8px]"} ${isOwn ? "justify-end" : "justify-start"}`}>
                  {!isOwn && !consec && <div className="w-[36px] mr-[6px] flex-shrink-0 self-end">{(() => { const ph = users[msg.senderId]?.photoURL; return ph ? <img src={ph} className="w-[36px] h-[36px] rounded-full object-cover" /> : <div className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-white text-[13px] font-medium" style={{ backgroundColor: getAvatarColor(msg.senderId) }}>{getInitials(msg.senderName)}</div>; })()}</div>}
                  {!isOwn && consec && <div className="w-[36px] mr-[6px] flex-shrink-0" />}
                  <div className="max-w-[65%] relative group" onContextMenu={(e) => handleContextMenu(e, msg)} onTouchStart={() => handleTouchStart(msg)} onTouchEnd={handleTouchEnd} onTouchMove={handleTouchMove} onClick={() => handleMessageClick(msg)}>
                    {msg.replyTo && <div className={`rounded-t-[12px] px-3 pt-2 pb-0 ${dk(theme,isOwn?"bg-[#d4e7f7]":"bg-[#cde4f0]",isOwn?"bg-[#1e3a5f]":"bg-[#1e2c3a]")}`}><div className="border-l-2 border-[#3390ec] pl-2"><span className="text-[12px] text-[#3390ec] font-medium">{msg.replyToName || "Ответ"}</span><p className={`truncate text-[12px] ${dk(theme,"text-[#707579]","text-gray-400")}`}>{msg.replyToText || "..."}</p></div></div>}
                    {msg.pinned && !msg.deleted && !msg.mediaDeleted && <div className={`px-3 pt-1 ${!msg.replyTo?"rounded-t-[12px]":""} ${dk(theme,isOwn?"bg-[#effdde]":"bg-white",isOwn?"bg-[#2b5278]":"bg-[#182533]")}`}><span className="text-[11px] text-[#3390ec]">📌 Закреплено</span></div>}
                    <div className={`px-3 py-[6px] shadow-sm ${dk(theme,isOwn?"bg-[#effdde]":"bg-white",isOwn?"bg-[#2b5278]":"bg-[#182533]")} ${msg.replyTo||msg.pinned?"":consec?(isOwn?"rounded-[12px] rounded-br-[4px]":"rounded-[12px] rounded-bl-[4px]"):"rounded-[12px]"}`}>
                      {!isOwn && !consec && chatInfo?.type === "group" && <span className="text-[13px] font-medium block mb-0.5" style={{ color: getAvatarColor(msg.senderId) }}>{msg.senderName}</span>}
                      <div className="flex items-end gap-2"><div className="flex-1 min-w-0">{renderContent(msg, isOwn)}</div>
                        <span className="flex items-center gap-0.5 flex-shrink-0 self-end translate-y-[-1px]">
                          {msg.edited && !msg.deleted && <span className="text-[10px] text-[#999] mr-0.5">ред</span>}
                          <span className={`text-[11px] leading-none whitespace-nowrap ${isOwn ? (theme==="dark"?"text-[#6db878]":"text-[#6db878]") : "text-[#a0acb6]"}`}>{formatTime(msg.timestamp)}</span>
                          {isOwn && !msg.deleted && (msg.read ? <svg className="w-[16px] h-[11px] text-[#4fae4e] ml-0.5" viewBox="0 0 16 11" fill="currentColor"><path d="M11.071.653a.457.457 0 01.304-.102c.109 0 .205.034.288.102a.326.326 0 01.131.262.326.326 0 01-.131.262L5.369 7.547a.457.457 0 01-.304.102.457.457 0 01-.304-.102L2.155 5.08a.326.326 0 01-.131-.262c0-.104.044-.192.131-.262a.457.457 0 01.304-.102c.109 0 .205.034.288.102l2.318 2.156L11.071.653z"/><path d="M14.071.653a.457.457 0 01.304-.102c.109 0 .205.034.288.102a.326.326 0 01.131.262.326.326 0 01-.131.262L8.369 7.547a.457.457 0 01-.304.102.457.457 0 01-.304-.102l-.774-.72.61-.572.468.436L14.071.653z"/></svg> : <svg className="w-[12px] h-[11px] text-[#6db878] ml-0.5" viewBox="0 0 12 11" fill="currentColor"><path d="M11.071.653a.457.457 0 01.304-.102c.109 0 .205.034.288.102a.326.326 0 01.131.262.326.326 0 01-.131.262L5.369 7.547a.457.457 0 01-.304.102.457.457 0 01-.304-.102L2.155 5.08a.326.326 0 01-.131-.262c0-.104.044-.192.131-.262a.457.457 0 01.304-.102c.109 0 .205.034.288.102l2.318 2.156L11.071.653z"/></svg>)}
                        </span>
                      </div>
                    </div>
                    {/* Reactions */}
                    {reactionEntries.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{reactionEntries.map(([emoji, uids]) => (<button key={emoji} onClick={() => toggleReaction(msg.id, emoji)} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] border ${uids[currentUser?.uid || ""] ? "border-[#3390ec] bg-[#3390ec]/10" : dk(theme,"border-[#ddd] bg-white","border-[#2c3e50] bg-[#17212b]")}`}><span>{emoji}</span><span className={`text-[11px] ${dk(theme,"text-[#707579]","text-gray-400")}`}>{Object.keys(uids).length}</span></button>))}</div>}
                    {/* Delete media button for received media */}
                    {hasMedia && !msg.mediaDeleted && !isOwn && <button onClick={(e) => { e.stopPropagation(); deleteMediaFromServer(msg); }} className="mt-1 text-[11px] text-red-400 hover:text-red-300 transition-colors">🗑 Удалить файл с сервера</button>}
                    {/* Media expiry timer */}
                    {hasMedia && !msg.mediaDeleted && msg.mediaExpiresAt && <p className={`text-[10px] mt-0.5 ${dk(theme,"text-[#999]","text-gray-500")}`}>⏰ Удалится через {Math.max(0, Math.round((msg.mediaExpiresAt - Date.now()) / 60000))} мин</p>}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to bottom */}
      {showScrollBtn && <button onClick={() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); setShowScrollBtn(false); }} className={`absolute bottom-24 right-6 w-10 h-10 rounded-full shadow-lg flex items-center justify-center z-20 ${dk(theme,"bg-white hover:bg-[#f4f4f5]","bg-[#17212b] hover:bg-[#1e2c3a]")}`}><svg className="w-5 h-5 text-[#707579]" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg></button>}

      {/* Reaction Picker */}
      {reactionPicker && (<><div className="fixed inset-0 z-40" onClick={() => setReactionPicker(null)} /><div className="fixed z-50 bg-white dark:bg-[#17212b] rounded-full shadow-2xl border border-[#e6e6e6] dark:border-[#2c3e50] px-2 py-1.5 flex gap-1 animate-in" style={{ left: Math.max(10, Math.min(reactionPicker.x - 120, window.innerWidth - 320)), top: Math.max(10, reactionPicker.y - 50) }}>{REACTION_EMOJIS.map((e) => (<button key={e} onClick={() => toggleReaction(reactionPicker.msgId, e)} className="w-8 h-8 flex items-center justify-center text-[20px] hover:bg-[#f4f4f5] dark:hover:bg-[#2c3e50] rounded-full transition-colors hover:scale-125">{e}</button>))}</div></>)}

      {/* Context Menu */}
      {contextMenu && (<><div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} /><div className={`fixed z-50 rounded-xl shadow-2xl border py-1.5 w-52 animate-in ${dk(theme,"bg-white border-[#e6e6e6]","bg-[#17212b] border-[#2c3e50]")}`} style={{ left: Math.min(contextMenu.x, window.innerWidth - 220), top: Math.min(contextMenu.y, window.innerHeight - 350) }}>
        <button onClick={() => { setReplyTo(contextMenu.msg); setContextMenu(null); inputRef.current?.focus(); }} className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-[#f4f4f5] dark:hover:bg-[#2c3e50] ${dk(theme,"text-[#222]","text-white")}`}><svg className="w-5 h-5 text-[#707579]" viewBox="0 0 24 24" fill="currentColor"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>Ответить</button>
        {contextMenu.msg.senderId === currentUser?.uid && !contextMenu.msg.deleted && !contextMenu.msg.mediaDeleted && contextMenu.msg.messageType === "text" && <button onClick={() => startEdit(contextMenu.msg)} className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-[#f4f4f5] dark:hover:bg-[#2c3e50] ${dk(theme,"text-[#222]","text-white")}`}><svg className="w-5 h-5 text-[#707579]" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 000-1.41l-2.34-2.34a.996.996 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>Редактировать</button>}
        <button onClick={() => startForward(contextMenu.msg)} className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-[#f4f4f5] dark:hover:bg-[#2c3e50] ${dk(theme,"text-[#222]","text-white")}`}><svg className="w-5 h-5 text-[#707579]" viewBox="0 0 24 24" fill="currentColor"><path d="M14 15V9l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" transform="scale(-1,1) translate(-24,0)"/></svg>Переслать</button>
        <button onClick={() => pinMessage(contextMenu.msg)} className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-[#f4f4f5] dark:hover:bg-[#2c3e50] ${dk(theme,"text-[#222]","text-white")}`}><svg className="w-5 h-5 text-[#707579]" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>{contextMenu.msg.pinned ? "Открепить" : "Закрепить"}</button>
        <button onClick={() => toggleStar(contextMenu.msg)} className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-[#f4f4f5] dark:hover:bg-[#2c3e50] ${dk(theme,"text-[#222]","text-white")}`}><svg className={`w-5 h-5 ${contextMenu.msg.starred ? "text-yellow-400" : "text-[#707579]"}`} viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>{contextMenu.msg.starred ? "Убрать из избранного" : "В избранное"}</button>
        <button onClick={() => { copyMessage(contextMenu.msg); setContextMenu(null); }} className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-[#f4f4f5] dark:hover:bg-[#2c3e50] ${dk(theme,"text-[#222]","text-white")}`}><svg className="w-5 h-5 text-[#707579]" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>Копировать</button>
        {contextMenu.msg.messageType === "image" && (contextMenu.msg.fileUrl || contextMenu.msg.thumbnailUrl) && !contextMenu.msg.mediaDeleted && <button onClick={() => { downloadPhoto(contextMenu.msg.fileUrl || contextMenu.msg.thumbnailUrl || "", contextMenu.msg.fileName); setContextMenu(null); }} className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-[#f4f4f5] dark:hover:bg-[#2c3e50] ${dk(theme,"text-[#222]","text-white")}`}><svg className="w-5 h-5 text-[#707579]" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>Сохранить фото</button>}
        {contextMenu.msg.messageType === "file" && contextMenu.msg.fileUrl && !contextMenu.msg.mediaDeleted && <button onClick={() => { downloadFile(contextMenu.msg); setContextMenu(null); }} className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-[#f4f4f5] dark:hover:bg-[#2c3e50] ${dk(theme,"text-[#222]","text-white")}`}><svg className="w-5 h-5 text-[#707579]" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>Скачать файл</button>}
        {(contextMenu.msg.fileUrl || contextMenu.msg.voiceUrl || contextMenu.msg.thumbnailUrl) && !contextMenu.msg.mediaDeleted && <button onClick={() => deleteMediaFromServer(contextMenu.msg)} className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-[#fef0f0] dark:hover:bg-red-900/20 text-orange-500`}><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z"/></svg>Удалить файл с сервера</button>}
        <div className="h-px bg-[#e6e6e6] dark:bg-[#2c3e50] mx-3 my-1" />
        <button onClick={() => deleteMessage(contextMenu.msg)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#e53935] hover:bg-[#fef0f0] dark:hover:bg-red-900/20"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>Удалить</button>
      </div></>)}

      {/* Photo Viewer Modal */}
      {photoViewer && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setPhotoViewer(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img src={photoViewer} alt="" className="max-w-full max-h-[85vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
            <div className="absolute top-4 right-4 flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); downloadPhoto(photoViewer); }} className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg></button>
              <button onClick={() => setPhotoViewer(null)} className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
            </div>
          </div>
        </div>
      )}

      {/* Forward Modal */}
      {forwardMsg && <ForwardModal forwardMsg={forwardMsg} onSelect={executeForward} onClose={() => setForwardMsg(null)} theme={theme} />}

      {/* Reply/Edit bar */}
      {(replyTo || editingMessage) && (
        <div className={`px-4 py-2 border-t flex items-center gap-3 flex-shrink-0 ${dk(theme,"bg-white border-[#e0e0e0]","bg-[#17212b] border-[#1e2c3a]")}`}>
          <div className={`border-l-2 ${editingMessage ? "border-[#e53935]" : "border-[#3390ec]"} pl-3 flex-1 min-w-0`}>
            <p className={`text-xs font-semibold ${editingMessage ? "text-[#e53935]" : "text-[#3390ec]"}`}>{editingMessage ? "Редактирование" : replyTo?.senderName}</p>
            <p className={`text-sm truncate ${dk(theme,"text-[#707579]","text-gray-400")}`}>{editingMessage ? editingMessage.text : replyTo?.messageType === "voice" ? "🎤 Голосовое" : replyTo?.text}</p>
          </div>
          <button onClick={() => { setReplyTo(null); setEditingMessage(null); setNewMessage(""); }} className="text-[#707579] hover:text-[#222] p-1 flex-shrink-0"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
        </div>
      )}

      {/* Emoji */}
      {showEmoji && (
        <div className={`border-t p-3 max-h-[220px] overflow-y-auto flex-shrink-0 ${dk(theme,"bg-white border-[#e0e0e0]","bg-[#17212b] border-[#1e2c3a]")}`}>
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1">{Object.keys(EMOJI_CATEGORIES).map((c) => <button key={c} className={`text-xs whitespace-nowrap px-2 py-1 rounded-full hover:bg-[#f4f4f5] dark:hover:bg-[#2c3e50] flex-shrink-0 ${dk(theme,"text-[#707579]","text-gray-400")}`}>{c}</button>)}</div>
          <div className="grid grid-cols-8 gap-1">{Object.values(EMOJI_CATEGORIES).flat().map((e, i) => <button key={i} onClick={() => { setNewMessage((p) => p + e); inputRef.current?.focus(); }} className={`w-9 h-9 flex items-center justify-center text-[22px] rounded-lg ${dk(theme,"hover:bg-[#f4f4f5]","hover:bg-[#2c3e50]")}`}>{e}</button>)}</div>
        </div>
      )}

      {/* Recording */}
      {isRecording && (
        <div className={`px-4 py-3 border-t flex items-center gap-4 flex-shrink-0 ${dk(theme,"bg-white border-[#e0e0e0]","bg-[#17212b] border-[#1e2c3a]")}`}>
          <div className="w-3 h-3 bg-[#e53935] rounded-full animate-pulse" />
          <span className="text-[#e53935] font-medium text-sm tabular-nums">{formatDuration(recordingDuration)}</span>
          <div className={`flex-1 h-8 rounded-full flex items-center overflow-hidden ${dk(theme,"bg-[#f4f4f5]","bg-[#242f3d]")}`}><div className="h-full bg-[#e53935]/10 rounded-full transition-all" style={{ width: `${Math.min((recordingDuration / 300) * 100, 100)}%` }} /></div>
          <button onClick={cancelRecording} className="p-2 text-[#707579] hover:text-[#222] rounded-full hover:bg-[#f4f4f5] dark:hover:bg-[#2c3e50]"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
          <button onClick={stopRecording} className="p-2.5 bg-[#3390ec] text-white rounded-full hover:bg-[#2b7fd4] shadow-md"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
        </div>
      )}

      {/* Upload */}
      {isUploading && <div className={`px-4 py-2 border-t flex-shrink-0 ${dk(theme,"bg-white border-[#e0e0e0]","bg-[#17212b] border-[#1e2c3a]")}`}><div className="flex items-center gap-3"><svg className="animate-spin h-4 w-4 text-[#3390ec]" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg><span className={`text-sm ${dk(theme,"text-[#707579]","text-gray-400")}`}>Отправка...</span></div></div>}

      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, "image")} />
      <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleFileSelect(e, "file")} />

      {/* Input */}
      {!isRecording && (
        <div id="chat-input-area" className={`px-3 py-2 flex-shrink-0 transition-transform ${dk(theme,"bg-white","bg-[#17212b]")}`}>
          <form onSubmit={sendMessage} className="flex items-center gap-1">
            {/* Emoji button */}
            <button type="button" onClick={() => setShowEmoji(!showEmoji)} className={`w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0 ${showEmoji ? "text-[#3390ec]" : "text-[#707579]"} hover:bg-[#f4f4f5] dark:hover:bg-[#2c3e50]`}><svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg></button>
            {/* Text input */}
            <input ref={inputRef} type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Сообщение" enterKeyHint="send" className={`flex-1 py-[9px] px-4 rounded-[20px] text-sm placeholder-[#a2acb4] focus:outline-none focus:ring-2 focus:ring-[#3390ec]/20 min-w-0 ${dk(theme,"bg-[#f4f4f5] text-[#222] focus:bg-white","bg-[#242f3d] text-white focus:bg-[#2c3e50]")}`} />
            {/* Attach file */}
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-10 h-10 flex items-center justify-center rounded-full text-[#707579] hover:bg-[#f4f4f5] dark:hover:bg-[#2c3e50] flex-shrink-0" title="Прикрепить файл"><svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg></button>
            {/* Photo */}
            <button type="button" onClick={() => imageInputRef.current?.click()} className="w-10 h-10 flex items-center justify-center rounded-full text-[#707579] hover:bg-[#f4f4f5] dark:hover:bg-[#2c3e50] flex-shrink-0" title="Фото"><svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg></button>
            {/* Voice / Send button - ALWAYS visible */}
            {newMessage.trim() ? (
              <button type="submit" className="w-11 h-11 flex items-center justify-center rounded-full bg-[#3390ec] text-white hover:bg-[#2b7fd4] flex-shrink-0 shadow-md shadow-blue-500/20 transition-all" title="Отправить">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            ) : (
              <button type="button" onClick={startRecording} className="w-11 h-11 flex items-center justify-center rounded-full bg-[#3390ec] text-white hover:bg-[#2b7fd4] flex-shrink-0 shadow-md shadow-blue-500/20 transition-all" title="Голосовое сообщение">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
              </button>
            )}
          </form>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white text-sm px-4 py-2 rounded-lg toast-in">{toast}</div>}

      {/* Call Modal */}
      {activeCall && <CallModal otherUserId={activeCall.otherUserId} otherUserName={activeCall.otherUserName} otherUserPhoto={activeCall.otherUserPhoto} isOutgoing={activeCall.isOutgoing} callType={activeCall.callType} onEnd={() => setActiveCall(null)} />}
    </div>
  );
}

// Forward Modal
function ForwardModal({ forwardMsg, onSelect, onClose, theme }: { forwardMsg: Message; onSelect: (id: string) => void; onClose: () => void; theme: ThemeMode }) {
  const [chats, setChats] = useState<{ id: string; name: string; photoURL: string }[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const cu = auth.currentUser;
  useEffect(() => {
    if (!cu) return;
    onValue(ref(db, "users"), (s) => { if (s.val()) setUsers(s.val()); });
    onValue(ref(db, `userChats/${cu.uid}`), (s) => {
      const d = s.val(); if (!d) { setChats([]); return; }
      const ids = Object.keys(d); const loaded: { id: string; name: string; photoURL: string }[] = [];
      ids.forEach((chatId) => { onValue(ref(db, `chats/${chatId}`), (cs) => { const cd = cs.val(); if (cd) { const oUid = Object.keys(cd.participants).find((u: string) => u !== cu.uid); const name = cd.savedMessages ? "Избранное" : cd.type === "group" ? (cd.name || "Группа") : (oUid && users[oUid]?.displayName || "Чат"); const photo = oUid ? users[oUid]?.photoURL || "" : ""; const idx = loaded.findIndex((c) => c.id === chatId); if (idx >= 0) loaded[idx] = { id: chatId, name, photoURL: photo }; else loaded.push({ id: chatId, name, photoURL: photo }); setChats([...loaded]); } }, { onlyOnce: true }); });
    });
  }, [cu, users]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className={`rounded-xl w-full max-w-sm shadow-2xl mx-4 animate-in overflow-hidden max-h-[80vh] flex flex-col ${theme==="dark"?"bg-[#17212b]":"bg-white"}`}>
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${theme==="dark"?"border-[#1e2c3a]":"border-[#e0e0e0]"}`}><button onClick={onClose} className="p-1 text-[#707579]"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button><h3 className={theme==="dark"?"text-white font-semibold":"text-[#222] font-semibold"}>Переслать в...</h3></div>
        <div className={`px-4 py-2 border-b ${theme==="dark"?"bg-[#242f3d] border-[#1e2c3a]":"bg-[#f4f4f5] border-[#e0e0e0]"}`}><p className={`text-sm truncate ${theme==="dark"?"text-gray-400":"text-[#707579]"}`}>{forwardMsg.messageType === "voice" ? "🎤 Голосовое" : forwardMsg.messageType === "image" ? "🖼️ Фото" : forwardMsg.text}</p></div>
        <div className="overflow-y-auto flex-1">
          {chats.map((c) => (<button key={c.id} onClick={() => { onSelect(c.id); onClose(); }} className={`w-full flex items-center gap-3 px-4 py-2.5 ${theme==="dark"?"hover:bg-[#2c3e50]":"hover:bg-[#f4f4f5]"} text-left`}>
            {c.photoURL ? <img src={c.photoURL} className="w-[42px] h-[42px] rounded-full object-cover" /> : <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-white font-medium text-[16px]" style={{ backgroundColor: getAvatarColor(c.id) }}>{getInitials(c.name)}</div>}
            <span className={`text-sm font-medium truncate ${theme==="dark"?"text-white":"text-[#222]"}`}>{c.name}</span>
          </button>))}
        </div>
      </div>
    </div>
  );
}
