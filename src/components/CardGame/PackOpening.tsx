import { useState } from "react";
import { GameCard, CardPack, CardRarity, Skill, UserGameProfile } from "../../types";
import charactersData from "../../characters.json";

// Helper to generate a random card with full stats, rarity and skills
export function generateGameCard(baseChar: any): GameCard {
  // Determine if Rick or Morty
  const isRick = baseChar.name.toLowerCase().includes("rick");
  const type: "Rick" | "Morty" = isRick ? "Rick" : "Morty";

  // Assign rarity based on random chance or card ID characteristics
  const rand = Math.random();
  let rarity: CardRarity = "Common";
  if (rand < 0.02) rarity = "Legendary";
  else if (rand < 0.08) rarity = "Epic";
  else if (rand < 0.22) rarity = "Rare";
  else if (rand < 0.50) rarity = "Uncommon";

  // Standard multiplier based on rarity
  let multiplier = 1;
  switch (rarity) {
    case "Legendary": multiplier = 2.2; break;
    case "Epic": multiplier = 1.7; break;
    case "Rare": multiplier = 1.4; break;
    case "Uncommon": multiplier = 1.15; break;
    default: multiplier = 1.0;
  }

  // Base stats influenced by type and scaled by rarity
  const baseHp = isRick ? 90 : 75;
  const baseAttack = isRick ? 25 : 18;
  const baseDefense = isRick ? 15 : 12;
  const baseSpeed = isRick ? 12 : 15;

  const hp = Math.floor((baseHp + Math.floor(Math.random() * 20)) * multiplier);
  const attack = Math.floor((baseAttack + Math.floor(Math.random() * 8)) * multiplier);
  const defense = Math.floor((baseDefense + Math.floor(Math.random() * 6)) * multiplier);
  const speed = Math.floor((baseSpeed + Math.floor(Math.random() * 5)) * multiplier);

  // Generate skills without using emojis
  const skills: Skill[] = [];
  if (isRick) {
    skills.push({
      name: "Portal Gun Blast",
      damage: Math.floor(attack * 0.9),
      description: "Shoots a highly unstable green portal directly under the opponent."
    });
    skills.push({
      name: "Laser Rifle",
      damage: Math.floor(attack * 1.3),
      effect: "stun",
      effectValue: 15, // 15% chance to stun
      description: "Discharges a highly concentrated plasma blast that can stun."
    });
    if (rarity === "Epic" || rarity === "Legendary") {
      skills.push({
        name: "Pickle Serum",
        damage: 0,
        effect: "heal",
        effectValue: Math.floor(hp * 0.4),
        description: "Injects genetic material to regenerate vital health points."
      });
    }
  } else {
    // Morty skills
    skills.push({
      name: "Awkward Slap",
      damage: Math.floor(attack * 0.8),
      description: "Delivers an unexpected but emotionally charged slap."
    });
    skills.push({
      name: "Panic Run",
      damage: Math.floor(attack * 1.2),
      effect: "buff",
      effectValue: 5, // boosts speed
      description: "Charges blindly in panic, increasing attack velocity."
    });
    if (rarity === "Epic" || rarity === "Legendary") {
      skills.push({
        name: "Jessica Encouragement",
        damage: 0,
        effect: "heal",
        effectValue: Math.floor(hp * 0.35),
        description: "Thinks about his crush, restoring massive confidence and HP."
      });
    }
  }

  const instanceId = Math.random().toString(36).substring(2, 11) + "_" + Date.now();

  return {
    id: baseChar.id,
    instanceId,
    name: baseChar.name,
    status: baseChar.status,
    species: baseChar.species,
    gender: baseChar.gender,
    image: baseChar.image,
    origin: baseChar.origin,
    location: baseChar.location,
    rarity,
    type,
    hp,
    maxHp: hp,
    attack,
    defense,
    speed,
    xp: 0,
    level: 1,
    skills
  };
}

// Available Card Packs for purchase
export const CARD_PACKS: CardPack[] = [
  {
    id: "standard",
    name: "Citadel Standard Pack",
    price: 150,
    cardCount: 3,
    description: "Contains 3 random Rick & Morty cards. High chance of Common and Uncommon cards.",
    rates: { Common: 0.60, Uncommon: 0.28, Rare: 0.09, Epic: 0.025, Legendary: 0.005 }
  },
  {
    id: "portal",
    name: "Mega Portal Pack",
    price: 350,
    cardCount: 5,
    description: "Contains 5 random cards. Increased chance of getting Rare, Epic, and Legendary Ricks or Mortys.",
    rates: { Common: 0.30, Uncommon: 0.40, Rare: 0.20, Epic: 0.08, Legendary: 0.02 }
  },
  {
    id: "premium",
    name: "Multiverse Legendary Pack",
    price: 750,
    cardCount: 5,
    description: "Ultimate bundle pack. Guarantees at least one Epic card and has a massive 10% Legendary pull rate!",
    rates: { Common: 0.10, Uncommon: 0.30, Rare: 0.35, Epic: 0.15, Legendary: 0.10 }
  }
];

interface PackOpeningProps {
  profile: UserGameProfile;
  onUpdateProfile: (p: Partial<UserGameProfile>) => void;
  theme: "light" | "dark";
}

export default function PackOpening({ profile, onUpdateProfile, theme }: PackOpeningProps) {
  const [opening, setOpening] = useState(false);
  const [pulledCards, setPulledCards] = useState<GameCard[]>([]);
  const [revealedIndex, setRevealedIndex] = useState<number>(-1);

  const getBorderColor = (rarity: CardRarity) => {
    switch (rarity) {
      case "Legendary": return "border-amber-500 shadow-amber-500/50 bg-gradient-to-b from-amber-950 to-slate-900";
      case "Epic": return "border-purple-500 shadow-purple-500/50 bg-gradient-to-b from-purple-950 to-slate-900";
      case "Rare": return "border-blue-500 shadow-blue-500/50 bg-gradient-to-b from-blue-950 to-slate-900";
      case "Uncommon": return "border-green-500 shadow-green-500/40 bg-gradient-to-b from-emerald-950 to-slate-900";
      default: return "border-slate-600 bg-slate-800";
    }
  };

  const getRarityBadge = (rarity: CardRarity) => {
    switch (rarity) {
      case "Legendary": return "bg-amber-500 text-amber-950 font-black tracking-widest px-2 py-0.5 rounded text-xs uppercase";
      case "Epic": return "bg-purple-500 text-purple-950 font-extrabold tracking-wider px-2 py-0.5 rounded text-xs uppercase";
      case "Rare": return "bg-blue-500 text-white font-bold px-2 py-0.5 rounded text-xs uppercase";
      case "Uncommon": return "bg-green-500 text-slate-950 font-bold px-2 py-0.5 rounded text-xs uppercase";
      default: return "bg-slate-600 text-slate-200 px-2 py-0.5 rounded text-xs uppercase";
    }
  };

  const openPack = (pack: CardPack) => {
    if (profile.coins < pack.price) {
      alert("Not enough coins! Win more battles to earn coins.");
      return;
    }

    setOpening(true);
    setRevealedIndex(0);

    const cardsPulled: GameCard[] = [];
    for (let i = 0; i < pack.cardCount; i++) {
      // Pick a random base character from json
      const randomIndex = Math.floor(Math.random() * charactersData.length);
      const baseChar = charactersData[randomIndex];
      const card = generateGameCard(baseChar);

      // Force high quality rates based on pack specification
      const packRand = Math.random();
      let pickedRarity: CardRarity = "Common";
      let accumulated = 0;
      for (const [r, rate] of Object.entries(pack.rates)) {
        accumulated += rate;
        if (packRand <= accumulated) {
          pickedRarity = r as CardRarity;
          break;
        }
      }

      // If premium pack and last card, let's make sure it is at least Epic if none pulled
      if (pack.id === "premium" && i === pack.cardCount - 1 && !cardsPulled.some(c => c.rarity === "Epic" || c.rarity === "Legendary")) {
        pickedRarity = Math.random() < 0.4 ? "Legendary" : "Epic";
      }

      // Re-apply multipliers for pickedRarity
      card.rarity = pickedRarity;
      let multiplier = 1;
      switch (pickedRarity) {
        case "Legendary": multiplier = 2.2; break;
        case "Epic": multiplier = 1.7; break;
        case "Rare": multiplier = 1.4; break;
        case "Uncommon": multiplier = 1.15; break;
        default: multiplier = 1.0;
      }
      const isRick = card.name.toLowerCase().includes("rick");
      const baseHp = isRick ? 90 : 75;
      const baseAttack = isRick ? 25 : 18;
      const baseDefense = isRick ? 15 : 12;
      const baseSpeed = isRick ? 12 : 15;

      card.hp = Math.floor((baseHp + Math.floor(Math.random() * 20)) * multiplier);
      card.maxHp = card.hp;
      card.attack = Math.floor((baseAttack + Math.floor(Math.random() * 8)) * multiplier);
      card.defense = Math.floor((baseDefense + Math.floor(Math.random() * 6)) * multiplier);
      card.speed = Math.floor((baseSpeed + Math.floor(Math.random() * 5)) * multiplier);

      // Regenerate skills based on rarity
      card.skills = [];
      if (isRick) {
        card.skills.push({
          name: "Portal Gun Blast",
          damage: Math.floor(card.attack * 0.9),
          description: "Shoots a highly unstable green portal directly under the opponent."
        });
        card.skills.push({
          name: "Laser Rifle",
          damage: Math.floor(card.attack * 1.3),
          effect: "stun",
          effectValue: 15,
          description: "Discharges a highly concentrated plasma blast that can stun."
        });
        if (pickedRarity === "Epic" || pickedRarity === "Legendary") {
          card.skills.push({
            name: "Pickle Serum",
            damage: 0,
            effect: "heal",
            effectValue: Math.floor(card.hp * 0.4),
            description: "Injects genetic material to regenerate vital health points."
          });
        }
      } else {
        card.skills.push({
          name: "Awkward Slap",
          damage: Math.floor(card.attack * 0.8),
          description: "Delivers an unexpected but emotionally charged slap."
        });
        card.skills.push({
          name: "Panic Run",
          damage: Math.floor(card.attack * 1.2),
          effect: "buff",
          effectValue: 5,
          description: "Charges blindly in panic, increasing attack velocity."
        });
        if (pickedRarity === "Epic" || pickedRarity === "Legendary") {
          card.skills.push({
            name: "Jessica Encouragement",
            damage: 0,
            effect: "heal",
            effectValue: Math.floor(card.hp * 0.35),
            description: "Thinks about his crush, restoring massive confidence and HP."
          });
        }
      }

      cardsPulled.push(card);
    }

    setPulledCards(cardsPulled);

    // Save pulled cards to profile inventory
    onUpdateProfile({
      coins: profile.coins - pack.price,
      cards: [...profile.cards, ...cardsPulled]
    });
  };

  const handleNextReveal = () => {
    if (revealedIndex < pulledCards.length - 1) {
      setRevealedIndex(prev => prev + 1);
    } else {
      // Done revealing
      setOpening(false);
      setPulledCards([]);
      setRevealedIndex(-1);
    }
  };

  const isDark = theme === "dark";

  return (
    <div className={`p-6 flex flex-col items-center h-full overflow-y-auto ${isDark ? "text-white" : "text-slate-800"}`}>
      <div className="text-center mb-6">
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-green-400 to-sky-400 bg-clip-text text-transparent uppercase">
          Portal Shop & Pack Opening
        </h2>
        <p className="text-sm mt-1 opacity-75">
          Buy booster packs to find rare cards and compile an ultimate battle deck.
        </p>
      </div>

      <div className="mb-6 flex items-center justify-between w-full max-w-4xl bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500 flex items-center justify-center font-bold text-yellow-500 text-lg">
            S
          </div>
          <div>
            <div className="text-xs opacity-60 uppercase font-bold tracking-wider">Your Balance</div>
            <div className="text-xl font-extrabold text-yellow-400">{profile.coins} Schmeckles</div>
          </div>
        </div>
        <div className="text-xs bg-slate-700/60 px-3 py-1.5 rounded-lg border border-slate-600/40">
          Earn 100 Schmeckles for every battle victory!
        </div>
      </div>

      {!opening ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          {CARD_PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`flex flex-col rounded-xl border p-5 transition-transform hover:-translate-y-1 hover:shadow-lg ${
                isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"
              }`}
            >
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold uppercase tracking-wide text-green-400">{pack.name}</h3>
                  <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-semibold">
                    {pack.cardCount} Cards
                  </span>
                </div>
                <p className="text-xs opacity-70 mb-4 h-12 overflow-hidden">{pack.description}</p>

                <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-800 mb-5 text-[11px] space-y-1">
                  <div className="font-bold uppercase tracking-wider mb-1 text-slate-400">Pull Rates:</div>
                  <div className="flex justify-between">
                    <span>Common:</span>
                    <span className="font-semibold text-slate-300">{(pack.rates.Common * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uncommon:</span>
                    <span className="font-semibold text-emerald-400">{(pack.rates.Uncommon * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rare:</span>
                    <span className="font-semibold text-blue-400">{(pack.rates.Rare * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Epic:</span>
                    <span className="font-semibold text-purple-400">{(pack.rates.Epic * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Legendary:</span>
                    <span className="font-semibold text-amber-400 font-extrabold">{(pack.rates.Legendary * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => openPack(pack)}
                disabled={profile.coins < pack.price}
                className={`w-full py-2.5 rounded-lg font-bold text-sm tracking-wide uppercase transition-colors ${
                  profile.coins >= pack.price
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white cursor-pointer shadow-md"
                    : "bg-slate-700 text-slate-500 cursor-not-allowed"
                }`}
              >
                Buy for {pack.price} S
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full flex flex-col items-center">
            <div className="mb-8 text-center">
              <div className="text-xs text-green-400 font-bold uppercase tracking-widest animate-pulse mb-1">Portal Signal Connected</div>
              <h3 className="text-2xl font-black text-white uppercase tracking-wider">Unwrapping Cards...</h3>
              <p className="text-xs text-slate-400 mt-1">Card {revealedIndex + 1} of {pulledCards.length}</p>
            </div>

            {revealedIndex >= 0 && revealedIndex < pulledCards.length && (
              <div className="w-80 h-[480px] perspective mb-8 animate-fade-in">
                <div className={`relative w-full h-full rounded-2xl border-4 p-4 shadow-xl flex flex-col ${getBorderColor(pulledCards[revealedIndex].rarity)} text-white`}>
                  {/* Card Rarity and ID */}
                  <div className="flex justify-between items-center mb-2">
                    {getRarityBadge(pulledCards[revealedIndex].rarity)}
                    <span className="text-[10px] font-mono opacity-50">#{pulledCards[revealedIndex].id}</span>
                  </div>

                  {/* Character Title */}
                  <h4 className="text-lg font-black tracking-tight text-center truncate uppercase mb-2 border-b border-white/10 pb-1">
                    {pulledCards[revealedIndex].name}
                  </h4>

                  {/* Image container */}
                  <div className="relative w-full h-48 bg-slate-950 rounded-lg overflow-hidden border border-white/10 mb-3">
                    <img
                      src={pulledCards[revealedIndex].image}
                      alt={pulledCards[revealedIndex].name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Card Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3 bg-black/40 p-2.5 rounded-lg border border-white/5 font-mono">
                    <div className="flex justify-between">
                      <span className="opacity-65">HP:</span>
                      <span className="font-bold text-red-400">{pulledCards[revealedIndex].hp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-65">SPD:</span>
                      <span className="font-bold text-sky-400">{pulledCards[revealedIndex].speed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-65">ATK:</span>
                      <span className="font-bold text-orange-400">{pulledCards[revealedIndex].attack}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-65">DEF:</span>
                      <span className="font-bold text-emerald-400">{pulledCards[revealedIndex].defense}</span>
                    </div>
                  </div>

                  {/* Skills Section */}
                  <div className="flex-1 overflow-y-auto pr-1">
                    <div className="text-[10px] uppercase font-bold tracking-wider opacity-40 mb-1">Battle Skills:</div>
                    <div className="space-y-1.5">
                      {pulledCards[revealedIndex].skills.map((skill, index) => (
                        <div key={index} className="bg-white/5 p-1.5 rounded text-[10px] border border-white/5">
                          <div className="flex justify-between font-bold text-green-400">
                            <span>{skill.name}</span>
                            {skill.damage > 0 && <span>DMG: {skill.damage}</span>}
                          </div>
                          <p className="opacity-75 text-[9px] leading-snug mt-0.5">{skill.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleNextReveal}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-600 text-white font-extrabold text-sm tracking-widest uppercase shadow-lg shadow-sky-500/25 cursor-pointer"
            >
              {revealedIndex < pulledCards.length - 1 ? "Next Card" : "Claim Cards"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
