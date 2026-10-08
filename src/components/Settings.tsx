import { useState, useEffect, useRef } from "react";
import { signOut, updateProfile } from "firebase/auth";
import { ref, onValue, off, set, update } from "firebase/database";
import { auth, db } from "../firebase";
import { User, ThemeMode, getAvatarColor, getInitials, compressImage } from "../types";
interface SettingsProps { onClose: () => void; theme: ThemeMode; onToggleTheme: () => void; }
const dk = (t: ThemeMode, l: string, d: string) => t === "dark" ? d : l;

export default function Settings({ onClose, theme, onToggleTheme }: SettingsProps) {
  const [userData, setUserData] = useState<User | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [newBio, setNewBio] = useState("");
  const [notifStatus, setNotifStatus] = useState<"default" | "granted" | "denied" | "unsupported">("default");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const currentUser = auth.currentUser;

  useEffect(() => { if (!currentUser) return; const r = ref(db, `users/${currentUser.uid}`); onValue(r, (s) => { const d = s.val(); if (d) { setUserData(d); if (!editingName) setNewDisplayName(d.displayName || ""); if (!editingUsername) setNewUsername(d.username || ""); if (!editingBio) setNewBio(d.bio || ""); } }); return () => off(r); }, [currentUser, editingName, editingUsername, editingBio]);
  useEffect(() => { if (!("Notification" in window)) { setNotifStatus("unsupported"); return; } setNotifStatus(Notification.permission); }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file || !currentUser) return; if (!file.type.startsWith("image/")) { alert("Выберите изображение"); return; } setUploadingAvatar(true); try { const b64 = await compressImage(file, 200, 0.6); await update(ref(db, `users/${currentUser.uid}`), { photoURL: b64 }); await updateProfile(currentUser, { photoURL: b64 }); } catch { alert("Ошибка загрузки"); } setUploadingAvatar(false); e.target.value = ""; };
  const removeAvatar = async () => { if (!currentUser) return; await update(ref(db, `users/${currentUser.uid}`), { photoURL: "" }); await updateProfile(currentUser, { photoURL: "" }); };
  const saveName = async () => { if (!currentUser || !newDisplayName.trim()) return; await updateProfile(currentUser, { displayName: newDisplayName.trim() }); await update(ref(db, `users/${currentUser.uid}`), { displayName: newDisplayName.trim() }); setEditingName(false); };
  const saveUsername = async () => { if (!currentUser || !newUsername.trim()) return; const t = newUsername.trim().toLowerCase().replace(/[^a-zA-Z0-9_]/g, ""); if (userData?.username) await set(ref(db, `usernames/${userData.username}`), null); await update(ref(db, `users/${currentUser.uid}`), { username: t }); await set(ref(db, `usernames/${t}`), currentUser.uid); setEditingUsername(false); };
  const saveBio = async () => { if (!currentUser) return; await update(ref(db, `users/${currentUser.uid}`), { bio: newBio.trim() }); setEditingBio(false); };
  const handleLogout = async () => { if (!currentUser) return; await update(ref(db, `users/${currentUser.uid}`), { online: false, lastSeen: Date.now() }); await signOut(auth); onClose(); };
  const enableNotifications = () => { if (!("Notification" in window)) { alert("Браузер не поддерживает уведомления"); return; } Notification.requestPermission().then((p) => { setNotifStatus(p); if (p === "granted") new Notification("Paralelogram 🔔", { body: "Уведомления включены!" }); }); };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-full max-w-[420px] h-full overflow-y-auto animate-in-left shadow-2xl ${dk(theme,"bg-white","bg-[#17212b]")}`}>
        <div className={`flex items-center gap-4 px-4 py-3 border-b sticky top-0 z-10 ${dk(theme,"bg-white border-[#e0e0e0]","bg-[#17212b] border-[#1e2c3a]")}`}><button onClick={onClose} className="p-1 text-[#707579] hover:text-[#222] dark:hover:text-white"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button><h2 className={`font-semibold text-lg ${dk(theme,"text-[#222]","text-white")}`}>Настройки</h2></div>

        {/* Avatar */}
        <div className={`px-6 py-6 border-b ${dk(theme,"border-[#e0e0e0]","border-[#1e2c3a]")}`}>
          <div className="flex flex-col items-center">
            <div className="relative group mb-4">
              {userData?.photoURL ? <img src={userData.photoURL} className="w-[100px] h-[100px] rounded-full object-cover" /> : <div className="w-[100px] h-[100px] rounded-full flex items-center justify-center text-white font-medium text-[36px]" style={{ backgroundColor: getAvatarColor(currentUser?.uid || "d") }}>{userData?.displayName ? getInitials(userData.displayName) : "U"}</div>}
              <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-colors cursor-pointer"><svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12m-3.2 0a3.2 3.2 0 1 0 6.4 0 3.2 3.2 0 1 0-6.4 0M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9z"/></svg></button>
              {uploadingAvatar && <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center"><svg className="animate-spin h-8 w-8 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg></div>}
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            <div className="flex items-center gap-3"><button onClick={() => avatarInputRef.current?.click()} className="text-[#3390ec] text-sm font-medium hover:underline">📷 Изменить фото</button>{userData?.photoURL && <button onClick={removeAvatar} className="text-[#e53935] text-sm hover:underline">Удалить</button>}</div>
            <h3 className={`font-semibold text-xl mt-3 ${dk(theme,"text-[#222]","text-white")}`}>{userData?.displayName || "Пользователь"}</h3>
            <p className="text-[#707579] text-sm">@{userData?.username || "username"}</p>
            {userData?.bio && <p className="text-[#707579] text-sm mt-1">{userData.bio}</p>}
          </div>
        </div>

        {/* Edit Fields */}
        <div className={`border-b ${dk(theme,"border-[#e0e0e0]","border-[#1e2c3a]")}`}>
          <div className="px-6 py-4">{editingName ? <div className="flex items-center gap-2"><div className="flex-1"><p className="text-[#3390ec] text-xs font-medium">Имя</p><input value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} className={`w-full px-2 py-1 border-b-2 border-[#3390ec] text-sm focus:outline-none ${dk(theme,"text-[#222]","text-white")}`} autoFocus onKeyDown={(e) => e.key === "Enter" && saveName()} /></div><button onClick={saveName} className="text-[#3390ec] text-sm font-medium p-1">✓</button><button onClick={() => setEditingName(false)} className="text-[#707579] text-sm p-1">✕</button></div> : <div className="cursor-pointer" onClick={() => setEditingName(true)}><p className="text-[#3390ec] text-xs font-medium">Имя</p><p className={`text-sm ${dk(theme,"text-[#222]","text-white")}`}>{userData?.displayName || "Не указано"}</p></div>}</div>
          <div className={`px-6 py-4 border-t ${dk(theme,"border-[#e0e0e0]","border-[#1e2c3a]")}`}>{editingUsername ? <div className="flex items-center gap-2"><div className="flex-1"><p className="text-[#3390ec] text-xs font-medium">Имя пользователя</p><input value={newUsername} onChange={(e) => setNewUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} className={`w-full px-2 py-1 border-b-2 border-[#3390ec] text-sm focus:outline-none ${dk(theme,"text-[#222]","text-white")}`} autoFocus onKeyDown={(e) => e.key === "Enter" && saveUsername()} /></div><button onClick={saveUsername} className="text-[#3390ec] text-sm font-medium p-1">✓</button><button onClick={() => setEditingUsername(false)} className="text-[#707579] text-sm p-1">✕</button></div> : <div className="cursor-pointer" onClick={() => setEditingUsername(true)}><p className="text-[#3390ec] text-xs font-medium">Имя пользователя</p><p className={`text-sm ${dk(theme,"text-[#222]","text-white")}`}>@{userData?.username || "не указано"}</p></div>}</div>
          <div className={`px-6 py-4 border-t ${dk(theme,"border-[#e0e0e0]","border-[#1e2c3a]")}`}>{editingBio ? <div className="flex items-center gap-2"><div className="flex-1"><p className="text-[#3390ec] text-xs font-medium">О себе</p><input value={newBio} onChange={(e) => setNewBio(e.target.value)} className={`w-full px-2 py-1 border-b-2 border-[#3390ec] text-sm focus:outline-none ${dk(theme,"text-[#222]","text-white")} placeholder-gray-500`} placeholder="Расскажите о себе" maxLength={70} autoFocus onKeyDown={(e) => e.key === "Enter" && saveBio()} /></div><button onClick={saveBio} className="text-[#3390ec] text-sm font-medium p-1">✓</button><button onClick={() => setEditingBio(false)} className="text-[#707579] text-sm p-1">✕</button></div> : <div className="cursor-pointer" onClick={() => setEditingBio(true)}><p className="text-[#3390ec] text-xs font-medium">О себе</p><p className={`text-sm ${dk(theme,"text-[#222]","text-white")}`}>{userData?.bio || "Привет, я использую Paralelogram!"}</p></div>}</div>
        </div>

        {/* Settings Items */}
        <div className="py-2">
          {/* Dark Theme Toggle */}
          <button onClick={onToggleTheme} className={`w-full flex items-center gap-4 px-6 py-3 transition-colors ${dk(theme,"hover:bg-[#f4f4f5]","hover:bg-[#2c3e50]")}`}>
            <svg className="w-6 h-6 text-[#707579]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>
            <div className="text-left flex-1"><p className={`text-sm ${dk(theme,"text-[#222]","text-white")}`}>Тёмная тема</p><p className="text-[#707579] text-xs">{theme === "dark" ? "🌙 Включена" : "☀️ Выключена"}</p></div>
            <div className={`w-12 h-6 rounded-full transition-colors ${theme === "dark" ? "bg-[#3390ec]" : "bg-[#ccc]"} relative`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${theme === "dark" ? "translate-x-6" : "translate-x-0.5"}`} />
            </div>
          </button>

          <button onClick={enableNotifications} className={`w-full flex items-center gap-4 px-6 py-3 transition-colors ${dk(theme,"hover:bg-[#f4f4f5]","hover:bg-[#2c3e50]")}`}><svg className="w-6 h-6 text-[#707579]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg><div className="text-left flex-1"><p className={`text-sm ${dk(theme,"text-[#222]","text-white")}`}>Уведомления</p><p className="text-xs">{notifStatus === "granted" ? "✅ Включены" : notifStatus === "denied" ? "❌ Заблокированы" : "⚠️ Нажмите чтобы включить"}</p></div></button>
          <button className={`w-full flex items-center gap-4 px-6 py-3 transition-colors ${dk(theme,"hover:bg-[#f4f4f5]","hover:bg-[#2c3e50]")}`}><svg className="w-6 h-6 text-[#707579]" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg><div className="text-left flex-1"><p className={`text-sm ${dk(theme,"text-[#222]","text-white")}`}>Конфиденциальность</p><p className="text-[#707579] text-xs">Последний визит, блокировка</p></div></button>
          <button className={`w-full flex items-center gap-4 px-6 py-3 transition-colors ${dk(theme,"hover:bg-[#f4f4f5]","hover:bg-[#2c3e50]")}`}><svg className="w-6 h-6 text-[#707579]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg><div className="text-left flex-1"><p className={`text-sm ${dk(theme,"text-[#222]","text-white")}`}>О Paralelogram</p><p className="text-[#707579] text-xs">Версия 1.0</p></div></button>
        </div>

        <div className={`py-2 border-t ${dk(theme,"border-[#e0e0e0]","border-[#1e2c3a]")}`}>
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-3 hover:bg-[#fef0f0] dark:hover:bg-red-900/20 transition-colors"><svg className="w-6 h-6 text-[#e53935]" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg><span className="text-[#e53935] text-sm font-medium">Выйти</span></button>
        </div>
        <div className="py-6 text-center"><svg width="40" height="40" viewBox="0 0 240 240" className="mx-auto mb-2 opacity-30"><defs><linearGradient id="pgS" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3390ec"/><stop offset="100%" stopColor="#6c5ce7"/></linearGradient></defs><rect width="240" height="240" rx="120" fill="url(#pgS)"/><path d="M85 70L175 70 155 170 65 170Z" fill="white" opacity=".9"/></svg><p className="text-[#a2acb4] text-xs">Paralelogram v1.0</p></div>
      </div>
    </div>
  );
}
