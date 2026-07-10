import { useAuth } from "./hooks/useAuth";
import Auth from "./components/Auth";
import Messenger from "./components/Messenger";
import { useEffect } from "react";
import { ref, update, get } from "firebase/database";
import { db } from "./firebase";

function ParalelogramLogo({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 240 240">
      <defs><linearGradient id="pgAppGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3390ec"/><stop offset="100%" stopColor="#6c5ce7"/></linearGradient></defs>
      <rect x="0" y="0" width="240" height="240" rx="120" fill="url(#pgAppGrad)"/>
      <path d="M85 70 L175 70 L155 170 L65 170 Z" fill="white" opacity="0.9"/>
      <path d="M95 170 L75 195 L110 170" fill="white" opacity="0.9"/>
      <rect x="100" y="95" width="55" height="6" rx="3" fill="#3390ec" opacity="0.6"/>
      <rect x="100" y="112" width="40" height="6" rx="3" fill="#3390ec" opacity="0.4"/>
      <rect x="100" y="129" width="48" height="6" rx="3" fill="#3390ec" opacity="0.5"/>
    </svg>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!user) return;
    const userRef = ref(db, `users/${user.uid}`);
    get(userRef).then((snapshot) => {
      if (!snapshot.exists()) {
        update(userRef, {
          uid: user.uid,
          username: user.displayName?.toLowerCase().replace(/\s+/g, "_") || "user",
          displayName: user.displayName || "Пользователь",
          photoURL: user.photoURL || "",
          online: true,
          lastSeen: Date.now(),
          bio: "",
        });
      } else {
        update(userRef, { online: true, lastSeen: Date.now() });
      }
    });
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-6 animate-pulse">
            <ParalelogramLogo size={120} />
          </div>
          <p className="text-[#707579] text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Auth />;
  return <Messenger />;
}
