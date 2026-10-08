import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import DiscoveryFeed from "./pages/DiscoveryFeed";
import Messenger from "./components/Messenger";
import Profile from "./components/Profile";

import { useNavigate } from "react-router-dom";

// Wrapper to provide navigate for profile onClose
const ProfileWrapper = () => {
  const navigate = useNavigate();
  return <Profile onClose={() => navigate("/")} />;
};

export default function App() {
  // Main App Router (bypass Auth for MVP Step 1 to demonstrate UI)
  // Use HashRouter instead of BrowserRouter to support file:// protocol for Capacitor/Android
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<DiscoveryFeed />} />
          <Route path="chats" element={<Messenger />} />
          <Route path="profile" element={<ProfileWrapper />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
