import { useState } from "react";
import SwipeCard, { SwipeCardProps } from "../components/SwipeCard";

const MOCK_DATA: SwipeCardProps[] = [
  {
    id: "1",
    name: "Алиса, 19",
    status: "Свободна",
    commonFriendsCount: 3,
    imageUrl: "https://rickandmortyapi.com/api/character/avatar/1.jpeg",
  },
  {
    id: "2",
    name: "Ева, 20",
    status: "В поиске",
    commonFriendsCount: 1,
    imageUrl: "https://rickandmortyapi.com/api/character/avatar/2.jpeg",
  },
  {
    id: "3",
    name: "Макс, 21",
    status: "Всё сложно",
    commonFriendsCount: 5,
    imageUrl: "https://rickandmortyapi.com/api/character/avatar/3.jpeg",
  },
];

export default function DiscoveryFeed() {
  const [cards, setCards] = useState<SwipeCardProps[]>(MOCK_DATA);

  const handleSwipe = (id: string, direction: "left" | "right") => {
    // In a real app, send swipe result to backend here
    console.log(`Swiped ${direction} on card ${id}`);
    setCards((prev) => prev.filter((card) => card.id !== id));
  };

  return (
    <div className="relative w-full h-full bg-[#0e1621] overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 to-pink-900/20 pointer-events-none" />

      {/* Header */}
      <div className="absolute top-0 w-full z-10 p-6">
        <h1 className="neon-text text-2xl font-bold text-center tracking-wide">
          DISCOVERY
        </h1>
      </div>

      {/* Cards Deck */}
      <div className="relative w-full h-full flex items-center justify-center">
        {cards.length === 0 ? (
          <div className="text-white/50 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full glass flex items-center justify-center animate-pulse">
              <span className="text-2xl">✨</span>
            </div>
            <p>Новых людей пока нет...</p>
          </div>
        ) : (
          // Render cards in reverse order so the first card is on top
          [...cards].reverse().map((card) => {
            return (
              <SwipeCard
                key={card.id}
                {...card}
                onSwipeLeft={() => handleSwipe(card.id, "left")}
                onSwipeRight={() => handleSwipe(card.id, "right")}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
