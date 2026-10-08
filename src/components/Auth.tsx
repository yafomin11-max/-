import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { ref, set, get } from "firebase/database";
import { auth, db } from "../firebase";

// Paralelogram logo SVG component
function ParalelogramLogo({ size = 160, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 240 240" className={className}>
      <defs>
        <linearGradient id="pgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3390ec" />
          <stop offset="100%" stopColor="#6c5ce7" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="240" height="240" rx="120" fill="url(#pgGrad)" />
      {/* Parallelogram shape */}
      <path d="M85 70 L175 70 L155 170 L65 170 Z" fill="white" opacity="0.9" />
      {/* Chat bubble tail */}
      <path d="M95 170 L75 195 L110 170" fill="white" opacity="0.9" />
      {/* Message lines inside parallelogram */}
      <rect x="100" y="95" width="55" height="6" rx="3" fill="#3390ec" opacity="0.6" />
      <rect x="100" y="112" width="40" height="6" rx="3" fill="#3390ec" opacity="0.4" />
      <rect x="100" y="129" width="48" height="6" rx="3" fill="#3390ec" opacity="0.5" />
    </svg>
  );
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!displayName.trim() || !username.trim()) {
          setError("Заполните все поля");
          setLoading(false);
          return;
        }
        if (username.trim().length < 3) {
          setError("Имя пользователя — минимум 3 символа");
          setLoading(false);
          return;
        }
        // Check if username is taken
        const usernameRef = ref(db, `usernames/${username.trim().toLowerCase()}`);
        const usernameSnap = await get(usernameRef);
        if (usernameSnap.exists()) {
          setError("Это имя пользователя уже занято");
          setLoading(false);
          return;
        }

        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: displayName.trim() });
        await set(ref(db, `users/${cred.user.uid}`), {
          uid: cred.user.uid,
          username: username.trim().toLowerCase(),
          displayName: displayName.trim(),
          photoURL: "",
          online: true,
          lastSeen: Date.now(),
          bio: "",
        });
        await set(ref(db, `usernames/${username.trim().toLowerCase()}`), cred.user.uid);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ошибка";
      if (msg.includes("email-already-in-use")) setError("Этот email уже используется");
      else if (msg.includes("wrong-password") || msg.includes("invalid-credential")) setError("Неверный пароль или email");
      else if (msg.includes("user-not-found")) setError("Пользователь не найден");
      else if (msg.includes("weak-password")) setError("Пароль — минимум 6 символов");
      else if (msg.includes("invalid-email")) setError("Неверный формат email");
      else if (msg.includes("too-many-requests")) setError("Слишком много попыток. Попробуйте позже");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e1621] flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass rounded-2xl p-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6">
            <ParalelogramLogo size={120} />
          </div>
          <h1 className="neon-text text-2xl font-medium mb-1">Paralelogram</h1>
          <p className="text-white/60 text-sm leading-5">
            {isLogin ? "Войдите в аккаунт, чтобы продолжить" : "Создайте аккаунт Paralelogram"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <>
              <div>
                <label className="block text-pink-400 text-xs font-medium mb-1.5">Имя</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-0 py-2 bg-transparent border-b border-white/20 text-white text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder-white/30"
                  placeholder="Ваше имя"
                />
              </div>
              <div>
                <label className="block text-pink-400 text-xs font-medium mb-1.5">Имя пользователя</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  className="w-full px-0 py-2 bg-transparent border-b border-white/20 text-white text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder-white/30"
                  placeholder="username"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-pink-400 text-xs font-medium mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-0 py-2 bg-transparent border-b border-white/20 text-white text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder-white/30"
              placeholder="example@mail.com"
            />
          </div>
          <div>
            <label className="block text-pink-400 text-xs font-medium mb-1.5">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-0 py-2 bg-transparent border-b border-white/20 text-white text-sm focus:outline-none focus:border-pink-500 transition-colors placeholder-white/30"
              placeholder="Минимум 6 символов"
            />
          </div>

          {error && (
            <div className="text-red-400 text-xs text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 neon-gradient text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                Загрузка...
              </span>
            ) : isLogin ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
            className="text-indigo-400 text-sm hover:underline"
          >
            {isLogin ? "Создать аккаунт" : "Уже есть аккаунт?"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { ParalelogramLogo };
