import { useState, useEffect } from "react";
import SwipeCard, { SwipeCardProps } from "../components/SwipeCard";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";

export default function DiscoveryFeed() {
  const [cards, setCards] = useState<SwipeCardProps[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch real users from Firebase Realtime Database
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert object to array of SwipeCardProps
        const loadedCards: SwipeCardProps[] = Object.keys(data).map(key => ({
          id: key,
          name: data[key].name || "АНОНИМ",
          status: data[key].status || "СВОБОДЕН(А)",
          commonFriendsCount: data[key].commonFriendsCount || Math.floor(Math.random() * 5) + 1, // Fallback random
          imageUrl: data[key].photoURL || `https://rickandmortyapi.com/api/character/avatar/${Math.floor(Math.random() * 50) + 1}.jpeg`,
        }));
        setCards(loadedCards);
      } else {
        setCards([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSwipe = (id: string, direction: "left" | "right") => {
    // In a real app, send swipe result to backend here
    console.log(`Swiped ${direction} on card ${id}`);
    setCards((prev) => prev.filter((card) => card.id !== id));
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Background ambient lighting (monochrome noise/texture placeholder) */}
      <div className="absolute inset-0 bg-black pointer-events-none opacity-50" style={{ backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      {/* Header */}
      <div className="absolute top-0 w-full z-10 p-6 flex justify-center mt-2">
        <div className="parallelogram-shape bg-white text-black px-8 py-2">
            <h1 className="text-2xl font-bold text-center tracking-[0.3em]">
            PARALLEL
            </h1>
        </div>
      </div>

      {/* Cards Deck */}
      <div className="relative w-full h-full flex items-center justify-center">
        {loading ? (
            <div className="text-white text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 parallelogram-shape bg-white animate-pulse flex items-center justify-center"></div>
              <p className="font-bold tracking-widest uppercase">ЗАГРУЗКА...</p>
            </div>
        ) : cards.length === 0 ? (
          <div className="text-white text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 parallelogram-shape bg-white border-4 border-black flex items-center justify-center opacity-50">
            </div>
            <p className="font-bold tracking-widest uppercase">НЕТ НОВЫХ ПРОФИЛЕЙ</p>
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
