export interface User {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string;
  online: boolean;
  lastSeen: number;
  bio?: string;
}

export interface Chat {
  id: string;
  participants: Record<string, boolean>;
  participantNames: Record<string, string>;
  participantPhotos: Record<string, string>;
  lastMessage: string;
  lastMessageTime: number;
  lastMessageSender: string;
  type: "private" | "group";
  name?: string;
  unreadCount?: number;
  pinned?: boolean;
  muted?: boolean;
  typingUsers?: Record<string, number>;
  lastMessageType?: string;
  savedMessages?: boolean;
  selfDestructTime?: number; // self destruct timer in seconds, or 0 (Off)
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  read: boolean;
  readBy?: Record<string, number>;
  replyTo?: string | null;
  replyToText?: string | null;
  replyToName?: string | null;
  forwardedFrom?: string | null;
  edited?: boolean;
  deleted?: boolean;
  pinned?: boolean;
  messageType?: "text" | "voice" | "image" | "file" | "video" | "call" | "location" | "contact" | "poll";
  voiceDuration?: number;
  voiceUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileUrl?: string;
  fileMimeType?: string;
  thumbnailUrl?: string;
  reactions?: Record<string, Record<string, boolean>>;
  mediaExpiresAt?: number;
  mediaDeleted?: boolean;
  starred?: boolean;
  callDuration?: number;
  callType?: "voice" | "video";
  callStatus?: "missed" | "ended" | "declined" | "ongoing";
  locationLat?: number;
  locationLng?: number;
  locationName?: string;
  pollQuestion?: string;
  pollOptions?: Record<string, { text: string; voters: Record<string, boolean> }>;
  contactUid?: string;
  contactName?: string;
  selfDestructAt?: number; // timestamp when this message must be auto-deleted
}

export const AVATAR_COLORS = ["#E17076","#7BC862","#6EC9CB","#65AADD","#A695E7","#EE7AAE","#FAA774","#6FB1E3"];
export function getAvatarColor(uid: string) {
  let h = 0; for (let i = 0; i < uid.length; i++) h = uid.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
export function getInitials(n: string) {
  return n.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}
export function formatTime(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts), now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Вчера";
  const week = new Date(now); week.setDate(week.getDate() - 6);
  if (d > week) return d.toLocaleDateString("ru", { weekday: "short" });
  return d.toLocaleDateString("ru", { day: "2-digit", month: "2-digit" });
}
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
  return (bytes / 1073741824).toFixed(1) + " GB";
}
export function formatDuration(s: number) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
export function formatCallDuration(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2,"0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(file);
  });
}
export function compressImage(file: File, maxSize = 200, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > h) { if (w > maxSize) { h *= maxSize / w; w = maxSize; } }
        else { if (h > maxSize) { w *= maxSize / h; h = maxSize; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ===== SOUNDS =====
let audioCtx: AudioContext | null = null;
function getCtx() { if (!audioCtx) audioCtx = new AudioContext(); return audioCtx; }

export function playSendSound() {
  try {
    const ctx = getCtx();
    // Short "whoosh" sound
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.07, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.12);
  } catch {}
}

export function playReceiveSound() {
  try {
    const ctx = getCtx();
    // Pleasant "ding-ding" notification
    [0, 0.12].forEach((delay) => {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime + delay);
      g.gain.setValueAtTime(0, ctx.currentTime + delay);
      g.gain.linearRampToValueAtTime(0.09, ctx.currentTime + delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.25);
      osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.25);
    });
  } catch {}
}

export function playNotifSound() { playReceiveSound(); }

export function playRingSound() {
  try {
    const ctx = getCtx();
    const ring = (start: number) => {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.type = "sine";
        const t = ctx.currentTime + start + i * 0.15;
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.12, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.start(t); osc.stop(t + 0.35);
      });
    };
    ring(0); ring(1.5); ring(3.0);
  } catch {}
}

export function stopRingSound() {
  try { if (audioCtx) { audioCtx.close(); audioCtx = null; } } catch {}
}

export function showBrowserNotification(title: string, body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#3390ec"/><path d="M30 30h40l-7 40H23z" fill="#fff" opacity=".9"/><path d="M36 70l-9 12 16-12" fill="#fff" opacity=".9"/><rect x="36" y="40" width="22" height="3" rx="1.5" fill="#3390ec" opacity=".5"/><rect x="36" y="47" width="16" height="3" rx="1.5" fill="#3390ec" opacity=".4"/><rect x="36" y="54" width="19" height="3" rx="1.5" fill="#3390ec" opacity=".5"/></svg>`;
    const n = new Notification(title, {
      body: body.slice(0, 200),
      tag: "paralelogram-" + Date.now(),
      icon: "data:image/svg+xml," + encodeURIComponent(iconSvg),
      badge: "data:image/svg+xml," + encodeURIComponent(iconSvg),
      requireInteraction: false,
      silent: true,
    });
    n.onclick = () => { window.focus(); n.close(); };
  } catch {}
}

export const REACTION_EMOJIS = ["👍","❤️","🔥","😂","😮","😢","🎉","👎"];
export type ThemeMode = "light" | "dark";
export function getStoredTheme(): ThemeMode { try { const t = localStorage.getItem("paralelogram-theme"); return t === "dark" ? "dark" : "light"; } catch { return "light"; } }
export function setStoredTheme(t: ThemeMode) { try { localStorage.setItem("paralelogram-theme", t); } catch {} }
export const MEDIA_EXPIRY_MS = 5 * 60 * 1000;
export const URL_REGEX = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

// Helper: dk (dark mode conditional class)
export const dk = (t: ThemeMode, light: string, dark: string) => t === "dark" ? dark : light;
