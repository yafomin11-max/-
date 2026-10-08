import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import DiscoveryFeed from "./pages/DiscoveryFeed";

// Temporary placeholder pages
const ChatsPlaceholder = () => (
  <div className="flex items-center justify-center h-full text-white/50">
    <p>Чаты в разработке...</p>
  </div>
);

const ProfilePlaceholder = () => (
  <div className="flex items-center justify-center h-full text-white/50">
    <p>Профиль в разработке...</p>
  </div>
);

export default function App() {
  // Main App Router (bypass Auth for MVP Step 1 to demonstrate UI)
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<DiscoveryFeed />} />
          <Route path="chats" element={<ChatsPlaceholder />} />
          <Route path="profile" element={<ProfilePlaceholder />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
