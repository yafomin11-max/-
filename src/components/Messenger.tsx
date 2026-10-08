import { useState, useEffect, useRef, useCallback } from "react";
import { ref, set, onValue, off, get, push, update } from "firebase/database";
import { auth, db } from "../firebase";
import Sidebar from "./Sidebar";
import ChatView from "./ChatView";
import NewChat from "./NewChat";
import Settings from "./Settings";
import { playNotifSound, playReceiveSound, showBrowserNotification, getStoredTheme, setStoredTheme, ThemeMode } from "../types";

export default function Messenger() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>(getStoredTheme);
  const notifTimesRef = useRef<Record<string, number>>({});
  const notifInitRef = useRef(false);
  const currentUser = auth.currentUser;

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    setStoredTheme(next);
  };

  // Request notification permission on first click
  useEffect(() => {
    const h = () => {
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
      document.removeEventListener("click", h);
    };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  // Online status
  useEffect(() => {
    if (!currentUser) return;
    const userRef = ref(db, `users/${currentUser.uid}/online`);
    const lsRef = ref(db, `users/${currentUser.uid}/lastSeen`);
    set(userRef, true); set(lsRef, Date.now());
    const onVis = () => document.hidden ? (set(userRef, false), set(lsRef, Date.now())) : (set(userRef, true), set(lsRef, Date.now()));
    const onUnload = () => { set(userRef, false); set(lsRef, Date.now()); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", onUnload);
    return () => { set(userRef, false); set(lsRef, Date.now()); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("beforeunload", onUnload); };
  }, [currentUser]);

  // Global push notifications
  useEffect(() => {
    if (!currentUser) return;
    const userChatsRef = ref(db, `userChats/${currentUser.uid}`);
    const listeners = new Set<string>();
    onValue(userChatsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      Object.keys(data).forEach((chatId) => {
        if (listeners.has(chatId)) return;
        listeners.add(chatId);
        if (!notifTimesRef.current[chatId]) notifTimesRef.current[chatId] = 0;
        onValue(ref(db, `chats/${chatId}`), (s) => {
          const cd = s.val(); if (!cd) return;
          const lt = cd.lastMessageTime || 0;
          const pt = notifTimesRef.current[chatId] || 0;
          if (pt > 0 && lt > pt && cd.lastMessageSender !== currentUser.uid) {
            if (!(chatId === selectedChatId && !document.hidden)) {
              playNotifSound();
              playReceiveSound();
              const name = cd.participantNames?.[cd.lastMessageSender] || "Пользователь";
              const preview = cd.lastMessageType === "voice" ? "🎤 Голосовое" : cd.lastMessageType === "image" ? "🖼️ Фото" : cd.lastMessageType === "video" ? "🎬 Видео" : cd.lastMessageType === "file" ? "📎 Файл" : cd.lastMessage || "Сообщение";
              showBrowserNotification(name, preview);
            }
          }
          notifTimesRef.current[chatId] = lt;
        });
      });
      notifInitRef.current = true;
    });
    return () => { off(userChatsRef); listeners.forEach((id) => off(ref(db, `chats/${id}`))); };
  }, [currentUser, selectedChatId]);

  // Auto-delete expired media from server
  const cleanupMedia = useCallback(async () => {
    if (!currentUser) return;
    const snap = await get(ref(db, `userChats/${currentUser.uid}`));
    const data = snap.val();
    if (!data) return;
    const now = Date.now();
    for (const chatId of Object.keys(data)) {
      const msgSnap = await get(ref(db, `messages/${chatId}`));
      const msgs = msgSnap.val();
      if (!msgs) continue;
      for (const [msgId, msg] of Object.entries(msgs) as [string, any][]) {
        if (msg.mediaExpiresAt && msg.mediaExpiresAt < now && !msg.mediaDeleted && (msg.fileUrl || msg.thumbnailUrl || msg.voiceUrl)) {
          await update(ref(db, `messages/${chatId}/${msgId}`), {
            mediaDeleted: true,
            fileUrl: null,
            thumbnailUrl: null,
            voiceUrl: null,
            text: "⏰ Медиафайл удалён (истёк срок хранения)",
          });
        }
      }
    }
  }, [currentUser]);

  // Run cleanup every 30 seconds
  useEffect(() => {
    cleanupMedia();
    const interval = setInterval(cleanupMedia, 30000);
    return () => clearInterval(interval);
  }, [cleanupMedia]);

  // Create Saved Messages
  const createSavedMessages = async () => {
    if (!currentUser) return;
    const snap = await get(ref(db, `userChats/${currentUser.uid}`));
    const existing = snap.val();
    if (existing) {
      for (const chatId of Object.keys(existing)) {
        const cs = await get(ref(db, `chats/${chatId}`));
        if (cs.val()?.savedMessages) {
          setSelectedChatId(chatId);
          if (window.innerWidth < 768) setSidebarVisible(false);
          return;
        }
      }
    }
    const ref_ = push(ref(db, "chats"));
    const chatId = ref_.key!;
    await set(ref_, {
      participants: { [currentUser.uid]: true },
      participantNames: { [currentUser.uid]: currentUser.displayName || "Я" },
      participantPhotos: {},
      lastMessage: "", lastMessageTime: Date.now(), lastMessageSender: "",
      type: "private", savedMessages: true,
    });
    await set(ref(db, `userChats/${currentUser.uid}/${chatId}`), true);
    setSelectedChatId(chatId);
    if (window.innerWidth < 768) setSidebarVisible(false);
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    if (window.innerWidth < 768) setSidebarVisible(false);
  };

  return (
    <div className={`h-screen w-screen flex overflow-hidden ${theme === "dark" ? "bg-[#0e1621]" : "bg-[#e8e0d6]"}`}>
      <div className={`${sidebarVisible ? "flex" : "hidden"} md:flex flex-col w-full md:w-[420px] flex-shrink-0 ${theme === "dark" ? "border-[#1e2c3a]" : "border-[#e0e0e0]"} border-r relative`}>
        <Sidebar selectedChatId={selectedChatId} onSelectChat={handleSelectChat} onOpenNewChat={() => setShowNewChat(true)} onOpenSettings={() => setShowSettings(true)} onCreateSavedMessages={createSavedMessages} theme={theme} />
      </div>
      <div className={`${!sidebarVisible ? "flex" : "hidden"} md:flex flex-1 flex-col min-w-0`}>
        <ChatView chatId={selectedChatId} onBack={() => setSidebarVisible(true)} theme={theme} />
      </div>
      {showNewChat && <NewChat onClose={() => setShowNewChat(false)} onChatCreated={(id) => { setSelectedChatId(id); setShowNewChat(false); if (window.innerWidth < 768) setSidebarVisible(false); }} theme={theme} />}
      {showSettings && <Settings onClose={() => setShowSettings(false)} theme={theme} onToggleTheme={toggleTheme} />}
    </div>
  );
}
