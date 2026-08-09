import { useState, useEffect } from "react";
import { ref, get, set, push } from "firebase/database";
import { auth, db } from "../firebase";
import { User, ThemeMode, getAvatarColor, getInitials } from "../types";
interface NewChatProps { onClose: () => void; onChatCreated: (chatId: string) => void; theme: ThemeMode; }
const dk = (t: ThemeMode, l: string, d: string) => t === "dark" ? d : l;

export default function NewChat({ onClose, onChatCreated, theme }: NewChatProps) {
  const [tab, setTab] = useState<"private" | "group">("private");
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const currentUser = auth.currentUser;

  useEffect(() => { get(ref(db, "users")).then((s) => { if (s.val()) setAllUsers((Object.values(s.val()) as User[]).filter((u) => u.uid !== currentUser?.uid)); }); }, [currentUser]);
  const filteredUsers = allUsers.filter((u) => u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || u.username.toLowerCase().includes(searchQuery.toLowerCase()));

  const startPrivateChat = async (otherUser: User) => {
    if (!currentUser || loading) return; setLoading(true);
    try { const snap = await get(ref(db, `userChats/${currentUser.uid}`)); const data = snap.val(); if (data) { for (const chatId of Object.keys(data)) { const cs = await get(ref(db, `chats/${chatId}`)); const cd = cs.val(); if (cd && cd.type === "private" && !cd.savedMessages && cd.participants[otherUser.uid]) { onChatCreated(chatId); setLoading(false); return; } } }
      const ref_ = push(ref(db, "chats")); const chatId = ref_.key!;
      await set(ref_, { participants: { [currentUser.uid]: true, [otherUser.uid]: true }, participantNames: { [currentUser.uid]: currentUser.displayName || "Пользователь", [otherUser.uid]: otherUser.displayName }, participantPhotos: { [currentUser.uid]: "", [otherUser.uid]: otherUser.photoURL || "" }, lastMessage: "", lastMessageTime: Date.now(), lastMessageSender: "", type: "private" });
      await set(ref(db, `userChats/${currentUser.uid}/${chatId}`), true); await set(ref(db, `userChats/${otherUser.uid}/${chatId}`), true); onChatCreated(chatId);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const createGroup = async () => {
    if (!currentUser || loading || selectedUsers.size === 0 || !groupName.trim()) return; setLoading(true);
    try { const participants: Record<string, boolean> = { [currentUser.uid]: true }; const participantNames: Record<string, string> = { [currentUser.uid]: currentUser.displayName || "Пользователь" }; const participantPhotos: Record<string, string> = {};
      selectedUsers.forEach((uid) => { const u = allUsers.find((x) => x.uid === uid); if (u) { participants[uid] = true; participantNames[uid] = u.displayName; participantPhotos[uid] = u.photoURL || ""; } });
      const ref_ = push(ref(db, "chats")); const chatId = ref_.key!;
      await set(ref_, { participants, participantNames, participantPhotos, lastMessage: "Группа создана", lastMessageTime: Date.now(), lastMessageSender: currentUser.uid, type: "group", name: groupName.trim() });
      for (const uid of Object.keys(participants)) await set(ref(db, `userChats/${uid}/${chatId}`), true);
      onChatCreated(chatId);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const toggleUser = (uid: string) => setSelectedUsers((p) => { const n = new Set(p); if (n.has(uid)) n.delete(uid); else n.add(uid); return n; });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className={`rounded-xl w-full max-w-sm shadow-2xl mx-4 animate-in overflow-hidden max-h-[85vh] flex flex-col ${dk(theme,"bg-white","bg-[#17212b]")}`}>
        <div className={`flex items-center gap-3 px-4 py-3 border-b flex-shrink-0 ${dk(theme,"border-[#e0e0e0]","border-[#1e2c3a]")}`}><button onClick={onClose} className="p-1 text-[#707579] hover:text-[#222] dark:hover:text-white"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button><h2 className={`font-semibold ${dk(theme,"text-[#222]","text-white")}`}>Новый чат</h2></div>
        <div className={`flex border-b flex-shrink-0 ${dk(theme,"border-[#e0e0e0]","border-[#1e2c3a]")}`}>
          <button onClick={() => setTab("private")} className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === "private" ? "text-[#3390ec] border-b-2 border-[#3390ec]" : "text-[#707579]"}`}>Личный</button>
          <button onClick={() => setTab("group")} className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === "group" ? "text-[#3390ec] border-b-2 border-[#3390ec]" : "text-[#707579]"}`}>Группа</button>
        </div>
        {tab === "group" && (<div className={`px-4 py-3 border-b flex-shrink-0 ${dk(theme,"border-[#e0e0e0]","border-[#1e2c3a]")}`}><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-[#3390ec] flex items-center justify-center text-white flex-shrink-0"><svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg></div><input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Название группы" className={`flex-1 py-2 bg-transparent border-b text-sm focus:outline-none focus:border-[#3390ec] ${dk(theme,"border-[#e0e0e0] text-[#222]","border-[#2c3e50] text-white")}`} autoFocus /></div>{selectedUsers.size > 0 && <p className="text-xs text-[#707579] mt-2">Выбрано: {selectedUsers.size}</p>}</div>)}
        <div className="px-4 py-2 flex-shrink-0"><div className="relative"><svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a2acb4]" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск" className={`w-full pl-10 pr-4 py-2 rounded-xl text-sm placeholder-[#a2acb4] focus:outline-none ${dk(theme,"bg-[#f4f4f5] text-[#222]","bg-[#242f3d] text-white")}`} /></div></div>
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length === 0 ? <div className="py-12 text-center text-sm text-[#a2acb4]">Нет пользователей</div> : filteredUsers.map((user) => (
            <button key={user.uid} onClick={() => tab === "private" ? startPrivateChat(user) : toggleUser(user.uid)} disabled={loading} className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left disabled:opacity-50 ${tab === "group" && selectedUsers.has(user.uid) ? "bg-[#3390ec]/10" : dk(theme,"hover:bg-[#f4f4f5]","hover:bg-[#2c3e50]")}`}>
              <div className="relative flex-shrink-0">{user.photoURL ? <img src={user.photoURL} className="w-[48px] h-[48px] rounded-full object-cover" /> : <div className="w-[48px] h-[48px] rounded-full flex items-center justify-center text-white font-medium text-[18px]" style={{ backgroundColor: getAvatarColor(user.uid) }}>{getInitials(user.displayName || user.username)}</div>}{user.online && <div className="absolute bottom-0 right-0 w-[12px] h-[12px] bg-[#4dcd5e] rounded-full border-2 border-white" />}</div>
              <div className="flex-1 min-w-0"><span className={`font-semibold text-sm block truncate ${dk(theme,"text-[#222]","text-white")}`}>{user.displayName}</span><span className="text-[#707579] text-xs">@{user.username}</span></div>
              {tab === "group" && <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedUsers.has(user.uid) ? "border-[#3390ec] bg-[#3390ec]" : "border-[#ccc]"}`}>{selectedUsers.has(user.uid) && <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}</div>}
            </button>
          ))}
        </div>
        {tab === "group" && selectedUsers.size > 0 && groupName.trim() && (<div className={`px-4 py-3 border-t flex-shrink-0 ${dk(theme,"border-[#e0e0e0]","border-[#1e2c3a]")}`}><button onClick={createGroup} disabled={loading} className="w-full py-3 bg-[#3390ec] text-white font-medium rounded-xl hover:bg-[#2b7fd4] disabled:opacity-50 text-sm">{loading ? "Создание..." : `Создать группу (${selectedUsers.size + 1})`}</button></div>)}
      </div>
    </div>
  );
}
