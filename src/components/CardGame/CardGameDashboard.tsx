import { useState, useEffect } from "react";
import { UserGameProfile, GameCard } from "../../types";
import PackOpening, { generateGameCard } from "./PackOpening";
import DeckBuilder from "./DeckBuilder";
import BattleArena from "./BattleArena";
import charactersData from "../../characters.json";

interface CardGameDashboardProps {
  onBackToMessenger: () => void;
  theme: "light" | "dark";
}

const DEFAULT_COINS = 500;

export default function CardGameDashboard({ onBackToMessenger, theme }: CardGameDashboardProps) {
  const [activeTab, setActiveTab] = useState<"lobby" | "shop" | "deck" | "battle">("lobby");
  const [profile, setProfile] = useState<UserGameProfile>({
    coins: DEFAULT_COINS,
    cards: [],
    deck: [],
    battlesWon: 0,
    battlesLost: 0
  });

  // Local storage profile persistence
  useEffect(() => {
    try {
      const stored = localStorage.getItem("rick_morty_tcg_profile");
      if (stored) {
        setProfile(JSON.parse(stored));
      } else {
        // Initialize starter deck
        const starters: GameCard[] = [];
        // Add Rick Sanchez (ID: 1) and Morty Smith (ID: 2) if possible
        const baseRick = charactersData.find((c) => c.id === 1) || charactersData[0];
        const baseMorty = charactersData.find((c) => c.id === 2) || charactersData[1];

        const rCard = generateGameCard(baseRick);
        rCard.rarity = "Rare"; // Give them a nice start!
        const mCard = generateGameCard(baseMorty);
        mCard.rarity = "Rare";

        starters.push(rCard);
        starters.push(mCard);

        // Add 3 more random cards
        for (let i = 0; i < 3; i++) {
          const rand = charactersData[Math.floor(Math.random() * charactersData.length)];
          starters.push(generateGameCard(rand));
        }

        const initialProfile: UserGameProfile = {
          coins: DEFAULT_COINS,
          cards: starters,
          deck: starters.map((c) => c.instanceId),
          battlesWon: 0,
          battlesLost: 0
        };

        setProfile(initialProfile);
        localStorage.setItem("rick_morty_tcg_profile", JSON.stringify(initialProfile));
      }
    } catch (e) {
      console.error("Failed loading card game profile:", e);
    }
  }, []);

  const handleUpdateProfile = (newFields: Partial<UserGameProfile>) => {
    setProfile((prev) => {
      const updated = { ...prev, ...newFields };
      try {
        localStorage.setItem("rick_morty_tcg_profile", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed saving card game profile:", e);
      }
      return updated;
    });
  };

  const isDark = theme === "dark";

  return (
    <div className={`h-screen flex flex-col ${isDark ? "bg-[#0f172a] text-white" : "bg-slate-50 text-slate-900"}`}>
      {/* Game Header */}
      <header className={`px-6 py-4 flex items-center justify-between border-b ${isDark ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToMessenger}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
              isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            Back to Chat
          </button>
          <h1 className="text-xl font-black tracking-wider uppercase bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-500 bg-clip-text text-transparent">
            Rick & Morty Card Battle
          </h1>
        </div>

        {/* Top-bar stats */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-1.5 text-sm font-mono font-bold text-yellow-500">
            <span className="w-5 h-5 rounded-full bg-yellow-500/20 border border-yellow-500 flex items-center justify-center text-xs">S</span>
            <span>{profile.coins}</span>
          </div>
          <div className="text-xs font-semibold opacity-70">
            W/L: <span className="text-green-500">{profile.battlesWon}</span> / <span className="text-red-500">{profile.battlesLost}</span>
          </div>
        </div>
      </header>

      {/* Main navigation tabs */}
      <div className={`flex justify-center border-b ${isDark ? "bg-slate-950/40 border-slate-900" : "bg-slate-100/50 border-slate-200"}`}>
        <div className="flex space-x-1 p-1.5 max-w-xl w-full">
          {([
            { id: "lobby", label: "Lobby" },
            { id: "shop", label: "Portal Shop" },
            { id: "deck", label: "Deck Builder" },
            { id: "battle", label: "Battle Arena" }
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-md"
                  : isDark
                    ? "text-slate-400 hover:bg-slate-900 hover:text-white"
                    : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Viewport */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "lobby" && (
          <div className="h-full overflow-y-auto p-6 max-w-4xl mx-auto flex flex-col justify-center">
            <div className="text-center mb-10">
              <div className="w-24 h-24 rounded-full mx-auto bg-gradient-to-tr from-emerald-500 to-indigo-500 p-0.5 mb-6 shadow-xl shadow-emerald-500/10">
                <div className={`w-full h-full rounded-full flex items-center justify-center font-black text-2xl ${isDark ? "bg-slate-950" : "bg-white text-slate-800"}`}>
                  RM
                </div>
              </div>
              <h2 className="text-3xl font-black uppercase tracking-widest mb-3">Citadel Coliseum Lobby</h2>
              <p className="text-sm opacity-75 max-w-md mx-auto leading-relaxed">
                Welcome to the Rick & Morty collectible card universe! Collect unique Ricks and Mortys, configure your active squad, and battle across dimensions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div
                onClick={() => setActiveTab("shop")}
                className={`p-6 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer ${
                  isDark ? "bg-slate-900 border-slate-850 hover:bg-slate-850" : "bg-white border-slate-200 hover:shadow-sm"
                }`}
              >
                <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center font-black mb-4">S</div>
                <h3 className="text-lg font-bold uppercase mb-1">Buy Card Packs</h3>
                <p className="text-xs opacity-65 leading-relaxed">Spend your Schmeckles to pull booster packs. Collect rare and legendary variants.</p>
              </div>

              <div
                onClick={() => setActiveTab("deck")}
                className={`p-6 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer ${
                  isDark ? "bg-slate-900 border-slate-850 hover:bg-slate-850" : "bg-white border-slate-200 hover:shadow-sm"
                }`}
              >
                <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center font-black mb-4">D</div>
                <h3 className="text-lg font-bold uppercase mb-1">Deck Builder</h3>
                <p className="text-xs opacity-65 leading-relaxed">Inspect your entire cards repository. Create the absolute squad of 5 active gladiators.</p>
              </div>

              <div
                onClick={() => setActiveTab("battle")}
                className={`p-6 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer ${
                  isDark ? "bg-slate-900 border-slate-850 hover:bg-slate-850" : "bg-white border-slate-200 hover:shadow-sm"
                }`}
              >
                <div className="w-10 h-10 bg-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center font-black mb-4">B</div>
                <h3 className="text-lg font-bold uppercase mb-1">Combat Arena</h3>
                <p className="text-xs opacity-65 leading-relaxed">Dueling portal is open. Enter turn-based battles and gain rewards for every dimensional victory.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "shop" && (
          <PackOpening profile={profile} onUpdateProfile={handleUpdateProfile} theme={theme} />
        )}

        {activeTab === "deck" && (
          <DeckBuilder profile={profile} onUpdateProfile={handleUpdateProfile} theme={theme} />
        )}

        {activeTab === "battle" && (
          <BattleArena profile={profile} onUpdateProfile={handleUpdateProfile} theme={theme} />
        )}
      </div>
    </div>
  );
}
