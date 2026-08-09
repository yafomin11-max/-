import { useState } from "react";
import { CardRarity, UserGameProfile } from "../../types";

interface DeckBuilderProps {
  profile: UserGameProfile;
  onUpdateProfile: (p: Partial<UserGameProfile>) => void;
  theme: "light" | "dark";
}

export default function DeckBuilder({ profile, onUpdateProfile, theme }: DeckBuilderProps) {
  const [filterType, setFilterType] = useState<"All" | "Rick" | "Morty">("All");
  const [filterRarity, setFilterRarity] = useState<"All" | CardRarity>("All");
  const [selectedCardInstanceId, setSelectedCardInstanceId] = useState<string | null>(null);

  const isDark = theme === "dark";

  // Card list and filter
  const filteredCards = profile.cards.filter((card) => {
    const typeMatch = filterType === "All" || card.type === filterType;
    const rarityMatch = filterRarity === "All" || card.rarity === filterRarity;
    return typeMatch && rarityMatch;
  });

  const getBorderColor = (rarity: CardRarity, isSelected: boolean) => {
    const base = isSelected ? "ring-4 ring-offset-2 ring-indigo-500 scale-[1.02]" : "";
    switch (rarity) {
      case "Legendary": return `${base} border-amber-500 shadow-sm shadow-amber-500/30 bg-gradient-to-b from-amber-950/40 to-slate-900`;
      case "Epic": return `${base} border-purple-500 shadow-sm shadow-purple-500/30 bg-gradient-to-b from-purple-950/40 to-slate-900`;
      case "Rare": return `${base} border-blue-500 shadow-sm shadow-blue-500/30 bg-gradient-to-b from-blue-950/40 to-slate-900`;
      case "Uncommon": return `${base} border-green-500 shadow-sm shadow-green-500/20 bg-gradient-to-b from-emerald-950/40 to-slate-900`;
      default: return `${base} border-slate-600 bg-slate-800/80`;
    }
  };

  const getRarityBadge = (rarity: CardRarity) => {
    switch (rarity) {
      case "Legendary": return "bg-amber-500 text-amber-950 font-black tracking-widest px-2 py-0.5 rounded text-[10px] uppercase";
      case "Epic": return "bg-purple-500 text-purple-950 font-extrabold tracking-wider px-2 py-0.5 rounded text-[10px] uppercase";
      case "Rare": return "bg-blue-500 text-white font-bold px-2 py-0.5 rounded text-[10px] uppercase";
      case "Uncommon": return "bg-green-500 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px] uppercase";
      default: return "bg-slate-600 text-slate-200 px-2 py-0.5 rounded text-[10px] uppercase";
    }
  };

  const handleToggleDeck = (instanceId: string) => {
    const inDeck = profile.deck.includes(instanceId);
    if (inDeck) {
      // Remove from deck
      onUpdateProfile({
        deck: profile.deck.filter((id) => id !== instanceId)
      });
    } else {
      // Add to deck
      if (profile.deck.length >= 5) {
        alert("Deck is full! Maximum 5 cards in your battle deck.");
        return;
      }
      onUpdateProfile({
        deck: [...profile.deck, instanceId]
      });
    }
  };

  const selectedCard = profile.cards.find(c => c.instanceId === selectedCardInstanceId);

  return (
    <div className={`p-6 flex flex-col h-full overflow-y-auto ${isDark ? "text-white" : "text-slate-800"}`}>
      <div className="text-center mb-6">
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent uppercase">
          Deck Builder & Inventory
        </h2>
        <p className="text-sm mt-1 opacity-75">
          Assemble your battle group of 5 cards to challenge other universes.
        </p>
      </div>

      {/* Battle Deck Section */}
      <div className="mb-8 bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-bold uppercase tracking-wider text-green-400">Your Battle Deck</h3>
            <p className="text-xs opacity-65">Choose exactly 5 cards to play in combat arena.</p>
          </div>
          <span className="text-sm font-bold bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full">
            {profile.deck.length} / 5 Cards Chosen
          </span>
        </div>

        {profile.deck.length === 0 ? (
          <div className="h-28 border border-dashed border-slate-600 rounded-xl flex items-center justify-center text-sm opacity-50">
            Deck is empty. Click cards below to add them here!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {profile.deck.map((id) => {
              const card = profile.cards.find((c) => c.instanceId === id);
              if (!card) return null;
              return (
                <div
                  key={card.instanceId}
                  onClick={() => setSelectedCardInstanceId(card.instanceId)}
                  className={`relative p-3 rounded-xl border cursor-pointer group transition-all duration-200 hover:-translate-y-1 ${getBorderColor(card.rarity, selectedCardInstanceId === card.instanceId)}`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleDeck(card.instanceId);
                    }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600/90 text-white flex items-center justify-center text-xs font-bold shadow hover:bg-red-700 z-10 cursor-pointer"
                  >
                    X
                  </button>
                  <div className="w-full h-24 rounded-lg overflow-hidden border border-white/10 mb-2">
                    <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold truncate">{card.name}</div>
                    <div className="text-[10px] mt-0.5 font-bold text-red-400">{card.hp} HP</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left pane: Filter and Inventory Grid */}
        <div className="flex-1 w-full">
          {/* Controls */}
          <div className="flex flex-wrap gap-4 mb-5 items-center justify-between">
            <div className="flex space-x-2">
              {(["All", "Rick", "Morty"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    filterType === type
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800/60 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="flex space-x-2">
              {(["All", "Common", "Uncommon", "Rare", "Epic", "Legendary"] as const).map((rarity) => (
                <button
                  key={rarity}
                  onClick={() => setFilterRarity(rarity)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    filterRarity === rarity
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800/60 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {rarity}
                </button>
              ))}
            </div>
          </div>

          {/* Cards count */}
          <div className="text-xs opacity-60 mb-3 uppercase tracking-wider font-bold">
            Inventory ({filteredCards.length} Cards matches)
          </div>

          {filteredCards.length === 0 ? (
            <div className="h-48 border border-dashed border-slate-600 rounded-xl flex items-center justify-center text-sm opacity-50">
              No matching cards. Go to Shop to pull more!
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto pr-2">
              {filteredCards.map((card) => {
                const isSelected = selectedCardInstanceId === card.instanceId;
                const inDeck = profile.deck.includes(card.instanceId);
                return (
                  <div
                    key={card.instanceId}
                    onClick={() => setSelectedCardInstanceId(card.instanceId)}
                    className={`relative p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${getBorderColor(card.rarity, isSelected)}`}
                  >
                    {inDeck && (
                      <span className="absolute top-2 right-2 bg-green-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider">
                        In Deck
                      </span>
                    )}
                    <div className="w-full h-28 rounded-lg overflow-hidden border border-white/10 mb-2">
                      <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-xs font-black truncate">{card.name}</div>
                    <div className="flex justify-between items-center mt-1">
                      {getRarityBadge(card.rarity)}
                      <span className="text-[10px] font-mono font-bold text-red-400">{card.hp} HP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right pane: Detailed Card Inspector */}
        <div className="w-full lg:w-80 flex-shrink-0">
          {selectedCard ? (
            <div className={`rounded-2xl border-4 p-5 flex flex-col h-[520px] ${getBorderColor(selectedCard.rarity, false)} text-white relative`}>
              <div className="flex justify-between items-center mb-2">
                {getRarityBadge(selectedCard.rarity)}
                <span className="text-[10px] font-mono opacity-55">#{selectedCard.id}</span>
              </div>

              <h4 className="text-lg font-black tracking-tight uppercase truncate border-b border-white/10 pb-1.5 mb-2">
                {selectedCard.name}
              </h4>

              <div className="relative w-full h-40 bg-slate-950 rounded-lg overflow-hidden border border-white/10 mb-3">
                <img src={selectedCard.image} alt={selectedCard.name} className="w-full h-full object-cover" />
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-black/40 p-2.5 rounded-lg border border-white/5 font-mono mb-3">
                <div className="flex justify-between">
                  <span className="opacity-60">HP:</span>
                  <span className="font-bold text-red-400">{selectedCard.hp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">ATK:</span>
                  <span className="font-bold text-orange-400">{selectedCard.attack}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">DEF:</span>
                  <span className="font-bold text-emerald-400">{selectedCard.defense}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">SPD:</span>
                  <span className="font-bold text-sky-400">{selectedCard.speed}</span>
                </div>
              </div>

              {/* Skills */}
              <div className="flex-1 overflow-y-auto pr-1 mb-4">
                <div className="text-[10px] uppercase font-bold tracking-wider opacity-40 mb-1">Skills:</div>
                <div className="space-y-1.5">
                  {selectedCard.skills.map((skill, i) => (
                    <div key={i} className="bg-white/5 p-1.5 rounded text-[10px] border border-white/5">
                      <div className="flex justify-between font-bold text-green-400">
                        <span>{skill.name}</span>
                        {skill.damage > 0 && <span>DMG: {skill.damage}</span>}
                      </div>
                      <p className="opacity-75 text-[9px] leading-snug mt-0.5">{skill.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleToggleDeck(selectedCard.instanceId)}
                className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors ${
                  profile.deck.includes(selectedCard.instanceId)
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                {profile.deck.includes(selectedCard.instanceId) ? "Remove from Battle Deck" : "Add to Battle Deck"}
              </button>
            </div>
          ) : (
            <div className="h-[520px] rounded-2xl border-2 border-dashed border-slate-700/50 flex flex-col items-center justify-center p-6 text-center opacity-40">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center mb-3">
                ?
              </div>
              <h4 className="text-sm font-bold uppercase">No Card Selected</h4>
              <p className="text-xs mt-1">Select any card from your inventory to inspect statistics and assign to your battle deck.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
