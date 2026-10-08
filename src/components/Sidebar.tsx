import { useState, useEffect, useRef } from "react";
import { ref, onValue, off, update, remove } from "firebase/database";
import { auth, db } from "../firebase";
import { Chat, User, ThemeMode, getAvatarColor, getInitials, formatTime } from "../types";
interface SidebarProps { selectedChatId: string | null; onSelectChat: (chatId: string) => void; onOpenNewChat: () => void; onOpenSettings: () => void; onCreateSavedMessages: () => void; theme: ThemeMode; }
const dk = (t: ThemeMode, l: string, d: string) => t === "dark" ? d : l;

export default function Sidebar({ selectedChatId, onSelectChat, onOpenNewChat, onOpenSettings, onCreateSavedMessages, theme }: SidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [chatCtx, setChatCtx] = useState<{ x: number; y: number; chatId: string } | null>(null);
  const chatListenersRef = useRef<Set<string>>(new Set());
  const currentUser = auth.currentUser;

  useEffect(() => { onValue(ref(db, "users"), (s) => { if (s.val()) setUsers(s.val()); }); return () => off(ref(db, "users")); }, []);
  useEffect(() => {
    if (!currentUser) return;
    const ucr = ref(db, `userChats/${currentUser.uid}`);
    onValue(ucr, (s) => { const d = s.val(); if (!d) { setChats([]); return; } const ids = Object.keys(d); chatListenersRef.current.forEach((id) => { if (!ids.includes(id)) { off(ref(db, `chats/${id}`)); chatListenersRef.current.delete(id); } }); ids.forEach((id) => { if (!chatListenersRef.current.has(id)) { chatListenersRef.current.add(id); onValue(ref(db, `chats/${id}`), (cs) => { const cd = cs.val(); setChats((p) => { const idx = p.findIndex((c) => c.id === id); if (cd) { const nc = { ...cd, id }; if (idx >= 0) { const u = [...p]; u[idx] = nc; return u; } return [...p, nc]; } return idx >= 0 ? p.filter((c) => c.id !== id) : p; }); }); } }); });
    return () => { off(ucr); chatListenersRef.current.forEach((id) => off(ref(db, `chats/${id}`))); chatListenersRef.current.clear(); };
  }, [currentUser]);

  const getChatName = (c: Chat) => { if (c.savedMessages) return "Избранное"; if (c.type === "group") return c.name || "Группа"; const uid = Object.keys(c.participants).find((u) => u !== currentUser?.uid); if (uid && users[uid]) return users[uid].displayName || users[uid].username || "Удалённый аккаунт"; return "Удалённый аккаунт"; };
  const getChatPhoto = (c: Chat) => { if (c.savedMessages) return "saved"; const uid = Object.keys(c.participants).find((u) => u !== currentUser?.uid); return uid ? users[uid]?.photoURL || "" : ""; };
  const isOnline = (c: Chat) => { if (c.type !== "private" || c.savedMessages) return false; const uid = Object.keys(c.participants).find((u) => u !== currentUser?.uid); return uid ? users[uid]?.online || false : false; };
  const getLastPreview = (c: Chat) => { if (!c.lastMessage && !c.lastMessageTime) return ""; const isOwn = c.lastMessageSender === currentUser?.uid; const p = isOwn ? "Вы: " : ""; if (c.lastMessageType === "voice") return p + "🎤 Голосовое"; if (c.lastMessageType === "image") return p + "🖼️ Фото"; if (c.lastMessageType === "video") return p + "🎬 Видео"; if (c.lastMessageType === "file") return p + "📎 Файл"; return p + (c.lastMessage || ""); };

  const filteredChats = chats.filter((c) => getChatName(c).toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => { if (a.pinned && !b.pinned) return -1; if (!a.pinned && b.pinned) return 1; if (a.savedMessages) return -1; if (b.savedMessages) return 1; return (b.lastMessageTime || 0) - (a.lastMessageTime || 0); });

  const togglePin = async (id: string) => { const c = chats.find((x) => x.id === id); if (c) await update(ref(db, `chats/${id}`), { pinned: !c.pinned }); setChatCtx(null); };
  const toggleMute = async (id: string) => { const c = chats.find((x) => x.id === id); if (c) await update(ref(db, `chats/${id}`), { muted: !c.muted }); setChatCtx(null); };
  const deleteChat = async (id: string) => { if (!currentUser) return; await remove(ref(db, `userChats/${currentUser.uid}/${id}`)); await remove(ref(db, `messages/${id}`)); await remove(ref(db, `chats/${id}`)); setChatCtx(null); };

  return (
    <div className={`flex flex-col h-full ${dk(theme,"bg-white","bg-[#17212b]")}`}>
      {/* Header */}
      <div className="flex items-center px-3 py-2 gap-2 flex-shrink-0">
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#f4f4f5] dark:hover:bg-[#2c3e50]"><svg className="w-6 h-6 text-[#707579]" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg></button>
          {showMenu && (<><div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} /><div className={`absolute top-11 left-0 z-20 rounded-xl shadow-lg border py-1.5 w-52 animate-in ${dk(theme,"bg-white border-[#e6e6e6]","bg-[#17212b] border-[#2c3e50]")}`}>
            <button onClick={() => { onCreateSavedMessages(); setShowMenu(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[#f4f4f5] dark:hover:bg-[#2c3e50] ${dk(theme,"text-[#222]","text-white")}`}><svg className="w-5 h-5 text-[#707579]" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>Избранное</button>
            <button onClick={() => { onOpenNewChat(); setShowMenu(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[#f4f4f5] dark:hover:bg-[#2c3e50] ${dk(theme,"text-[#222]","text-white")}`}><svg className="w-5 h-5 text-[#707579]" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>Новый чат</button>
            <div className={`h-px mx-3 my-1 ${dk(theme,"bg-[#e6e6e6]","bg-[#2c3e50]")}`} />
            <button onClick={() => { onOpenSettings(); setShowMenu(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[#f4f4f5] dark:hover:bg-[#2c3e50] ${dk(theme,"text-[#222]","text-white")}`}><svg className="w-5 h-5 text-[#707579]" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>Настройки</button>
          </div></>)}
        </div>
        <div className="flex-1 relative">
          <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${searchFocused ? "text-[#3390ec]" : "text-[#a2acb4]"}`} viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} placeholder="Поиск" className={`w-full pl-10 pr-4 py-[7px] rounded-[20px] text-sm placeholder-[#a2acb4] focus:outline-none focus:ring-2 focus:ring-[#3390ec]/20 ${dk(theme,"bg-[#f4f4f5] text-[#222] focus:bg-white","bg-[#242f3d] text-white focus:bg-[#2c3e50]")}`} />
        </div>
      </div>

      {/* Chat Context Menu */}
      {chatCtx && (<><div className="fixed inset-0 z-40" onClick={() => setChatCtx(null)} onContextMenu={(e) => { e.preventDefault(); setChatCtx(null); }} /><div className={`fixed z-50 rounded-xl shadow-2xl border py-1.5 w-48 animate-in ${dk(theme,"bg-white border-[#e6e6e6]","bg-[#17212b] border-[#2c3e50]")}`} style={{ left: Math.min(chatCtx.x, window.innerWidth - 200), top: Math.min(chatCtx.y, window.innerHeight - 200) }}>
        <button onClick={() => togglePin(chatCtx.chatId)} className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-[#f4f4f5] dark:hover:bg-[#2c3e50] ${dk(theme,"text-[#222]","text-white")}`}><svg className="w-5 h-5 text-[#707579]" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>{chats.find((c) => c.id === chatCtx.chatId)?.pinned ? "Открепить" : "Закрепить"}</button>
        <button onClick={() => toggleMute(chatCtx.chatId)} className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-[#f4f4f5] dark:hover:bg-[#2c3e50] ${dk(theme,"text-[#222]","text-white")}`}><svg className="w-5 h-5 text-[#707579]" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>{chats.find((c) => c.id === chatCtx.chatId)?.muted ? "Вкл. звук" : "Без звука"}</button>
        <div className={`h-px mx-3 my-1 ${dk(theme,"bg-[#e6e6e6]","bg-[#2c3e50]")}`} />
        <button onClick={() => deleteChat(chatCtx.chatId)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#e53935] hover:bg-[#fef0f0] dark:hover:bg-red-900/20"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>Удалить</button>
      </div></>)}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="py-20 text-center"><p className="text-[#a2acb4] text-sm">{searchQuery ? "Ничего не найдено" : "Нет чатов"}</p>{!searchQuery && <button onClick={onOpenNewChat} className="mt-3 px-4 py-2 bg-[#3390ec] text-white text-sm rounded-full hover:bg-[#2b7fd4]">Начать чат</button>}</div>
        ) : filteredChats.map((chat) => {
          const isSel = selectedChatId === chat.id;
          const name = getChatName(chat);
          const photo = getChatPhoto(chat);
          return (
            <div key={chat.id} onClick={() => onSelectChat(chat.id)} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setChatCtx({ x: e.clientX, y: e.clientY, chatId: chat.id }); }} className={`flex items-center gap-3 px-3 py-[9px] cursor-pointer transition-colors ${isSel ? "bg-[#3390ec]" : dk(theme,"hover:bg-[#f4f4f5]","hover:bg-[#2c3e50]")}`}>
              <div className="relative flex-shrink-0">
                {chat.savedMessages ? <div className="w-[54px] h-[54px] rounded-full bg-[#3390ec] flex items-center justify-center text-white"><svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg></div> : photo ? <img src={photo} className="w-[54px] h-[54px] rounded-full object-cover" /> : <div className="w-[54px] h-[54px] rounded-full flex items-center justify-center text-white font-medium text-[20px]" style={{ backgroundColor: getAvatarColor(chat.type === "private" ? (Object.keys(chat.participants).find((u) => u !== currentUser?.uid) || chat.id) : chat.id) }}>{chat.type === "group" ? "👥" : getInitials(name)}</div>}
                {chat.type === "private" && !chat.savedMessages && isOnline(chat) && <div className="absolute bottom-0 right-0 w-[14px] h-[14px] bg-[#4dcd5e] rounded-full border-[2.5px] border-white" />}
              </div>
              <div className={`flex-1 min-w-0 border-b pb-[9px] ${dk(theme,"border-[#e6e6e6]","border-[#1e2c3a]")}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    {chat.muted && <svg className={`w-4 h-4 flex-shrink-0 ${isSel ? "text-white/60" : "text-[#a2acb4]"}`} viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>}
                    <span className={`text-[15px] truncate ${isSel ? "text-white font-semibold" : dk(theme,"text-[#222]","text-white")}`}>{name}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    {chat.pinned && !isSel && <svg className="w-4 h-4 text-[#a2acb4] rotate-45" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>}
                    <span className={`text-xs ${isSel ? "text-white/70" : chat.unreadCount ? "text-[#3390ec]" : "text-[#a2acb4]"}`}>{formatTime(chat.lastMessageTime)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className={`text-sm truncate pr-2 ${isSel ? "text-white/80" : dk(theme,"text-[#707579]","text-gray-400")}`}>{getLastPreview(chat) || "Нет сообщений"}</p>
                  {chat.unreadCount && chat.unreadCount > 0 && <div className={`flex-shrink-0 min-w-[22px] h-[22px] rounded-full flex items-center justify-center text-[12px] font-medium px-1.5 ${isSel ? "bg-white text-[#3390ec]" : chat.muted ? "bg-[#b0b7bc] text-white" : "bg-[#3390ec] text-white"}`}>{chat.unreadCount}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
