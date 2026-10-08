import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import DiscoveryFeed from "./pages/DiscoveryFeed";
import Messenger from "./components/Messenger";
import Profile from "./components/Profile";

export default function App() {
  // Main App Router (bypass Auth for MVP Step 1 to demonstrate UI)
  // Use HashRouter instead of BrowserRouter to support file:// protocol for Capacitor/Android
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<DiscoveryFeed />} />
          <Route path="chats" element={<Messenger />} />
          <Route path="profile" element={<Profile onClose={() => {}} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
