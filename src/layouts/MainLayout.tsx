import { Outlet, NavLink } from "react-router-dom";
import { Sparkles, MessageCircle, User } from "lucide-react";

export default function MainLayout() {
  const navItems = [
    { to: "/", icon: Sparkles, label: "Лента" },
    { to: "/chats", icon: MessageCircle, label: "Чаты" },
    { to: "/profile", icon: User, label: "Профиль" },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-[#0e1621]">
      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        <Outlet />
      </main>

      {/* Fixed Bottom Navigation (Glassmorphism) */}
      <nav className="fixed bottom-0 left-0 right-0 glass-dark border-t border-white/10 pb-safe pt-2 px-6">
        <div className="flex items-center justify-between max-w-md mx-auto mb-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 ${
                  isActive ? "text-pink-500 scale-110" : "text-white/40 hover:text-white/70"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <item.icon size={26} strokeWidth={isActive ? 2.5 : 2} />
                    {isActive && (
                      <div className="absolute -inset-2 bg-pink-500/20 blur-xl rounded-full z-[-1]" />
                    )}
                  </div>
                  <span className="text-[10px] font-medium tracking-wide">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
