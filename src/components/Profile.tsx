import { useState } from "react";
import { signOut, updateProfile } from "firebase/auth";
import { ref, onValue, off, set } from "firebase/database";
import { auth, db } from "../firebase";
import { User } from "../types";
import { useEffect } from "react";

interface ProfileProps {
  onClose: () => void;
}

export default function Profile({ onClose }: ProfileProps) {
  const [userData, setUserData] = useState<User | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;
    const userRef = ref(db, `users/${currentUser.uid}`);
    onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUserData(data);
        if (!editingName) setNewDisplayName(data.displayName || "");
        if (!editingUsername) setNewUsername(data.username || "");
      }
    });
    return () => off(userRef);
  }, [currentUser, editingName, editingUsername]);

  const handleSaveName = async () => {
    if (!currentUser || !newDisplayName.trim()) return;
    try {
      await updateProfile(currentUser, {
        displayName: newDisplayName.trim(),
      });
      await set(ref(db, `users/${currentUser.uid}/displayName`), newDisplayName.trim());
      setEditingName(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveUsername = async () => {
    if (!currentUser || !newUsername.trim()) return;
    try {
      const trimmed = newUsername.trim().toLowerCase().replace(/[^a-zA-Z0-9_]/g, "");
      // Remove old username mapping
      if (userData?.username) {
        await set(ref(db, `usernames/${userData.username}`), null);
      }
      // Set new username
      await set(ref(db, `users/${currentUser.uid}/username`), trimmed);
      await set(ref(db, `usernames/${trimmed}`), currentUser.uid);
      setEditingUsername(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    if (!currentUser) return;
    // Set offline
    await set(ref(db, `users/${currentUser.uid}/online`), false);
    await set(ref(db, `users/${currentUser.uid}/lastSeen`), Date.now());
    await signOut(auth);
    onClose();
  };

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#17212b] rounded-2xl shadow-2xl border border-white/10 overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5">
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <h2 className="text-white font-semibold text-lg">Профиль</h2>
        </div>

        {/* Profile Content */}
        <div className="p-6">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold mb-4">
              {userData?.displayName
                ? getInitials(userData.displayName)
                : "U"}
            </div>
          </div>

          {/* Display Name */}
          <div className="mb-4">
            <label className="block text-gray-400 text-xs mb-1">Имя</label>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500"
                >
                  ✓
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="px-3 py-2 bg-white/5 text-gray-400 text-sm rounded-lg hover:bg-white/10"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div
                className="flex items-center justify-between group cursor-pointer hover:bg-white/5 -mx-2 px-2 py-1 rounded-lg transition-colors"
                onClick={() => setEditingName(true)}
              >
                <span className="text-white text-sm">
                  {userData?.displayName || "Не указано"}
                </span>
                <svg
                  className="w-4 h-4 text-gray-600 group-hover:text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Username */}
          <div className="mb-4">
            <label className="block text-gray-400 text-xs mb-1">
              Имя пользователя
            </label>
            {editingUsername ? (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    @
                  </span>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) =>
                      setNewUsername(
                        e.target.value.replace(/[^a-zA-Z0-9_]/g, "")
                      )
                    }
                    className="w-full pl-7 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleSaveUsername}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500"
                >
                  ✓
                </button>
                <button
                  onClick={() => setEditingUsername(false)}
                  className="px-3 py-2 bg-white/5 text-gray-400 text-sm rounded-lg hover:bg-white/10"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div
                className="flex items-center justify-between group cursor-pointer hover:bg-white/5 -mx-2 px-2 py-1 rounded-lg transition-colors"
                onClick={() => setEditingUsername(true)}
              >
                <span className="text-white text-sm">
                  @{userData?.username || "не указано"}
                </span>
                <svg
                  className="w-4 h-4 text-gray-600 group-hover:text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Email */}
          <div className="mb-6">
            <label className="block text-gray-400 text-xs mb-1">Email</label>
            <span className="text-white text-sm">
              {currentUser?.email || "Не указан"}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-red-500/10 text-red-400 font-semibold rounded-xl hover:bg-red-500/20 transition-colors text-sm"
          >
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  );
}
