import { Outlet, NavLink } from "react-router-dom";
import { Layers, MessageSquare, UserSquare } from "lucide-react";

export default function MainLayout() {
  const navItems = [
    { to: "/", icon: Layers, label: "ГЛАВНАЯ" },
    { to: "/chats", icon: MessageSquare, label: "ЧАТЫ" },
    { to: "/profile", icon: UserSquare, label: "ПРОФИЛЬ" },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-black">
      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        <Outlet />
      </main>

      {/* Fixed Bottom Navigation (Monochrome/Geometric) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t-2 border-white pb-safe pt-2 px-6">
        <div className="flex items-center justify-between max-w-md mx-auto mb-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 p-2 transition-all duration-300 ${
                  isActive ? "text-white" : "text-white/40 hover:text-white/70"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`relative flex items-center justify-center w-12 h-10 ${isActive ? 'parallelogram-shape bg-white text-black' : ''}`}>
                    <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "z-10" : ""} />
                  </div>
                  <span className="text-[10px] font-bold tracking-widest mt-1">
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
