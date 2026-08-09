import { useState, useEffect } from "react";
import { GameCard, UserGameProfile } from "../../types";
import charactersData from "../../characters.json";
import { generateGameCard } from "./PackOpening";

interface BattleArenaProps {
  profile: UserGameProfile;
  onUpdateProfile: (p: Partial<UserGameProfile>) => void;
  theme: "light" | "dark";
}

interface BattleLog {
  text: string;
  type: "system" | "player" | "opponent" | "victory" | "defeat";
}

export default function BattleArena({ profile, onUpdateProfile, theme }: BattleArenaProps) {
  const [battleActive, setBattleActive] = useState(false);
  const [battleEnded, setBattleEnded] = useState(false);
  const [victory, setVictory] = useState(false);

  // Active cards in current round
  const [playerTeam, setPlayerTeam] = useState<GameCard[]>([]);
  const [opponentTeam, setOpponentTeam] = useState<GameCard[]>([]);

  const [activePlayerIdx, setActivePlayerIdx] = useState<number>(0);
  const [activeOpponentIdx, setActiveOpponentIdx] = useState<number>(0);

  const [logs, setLogs] = useState<BattleLog[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);

  const isDark = theme === "dark";

  const startNewBattle = () => {
    if (profile.deck.length !== 5) {
      alert("Please assemble exactly 5 cards in your Battle Deck before challenging the Multiverse!");
      return;
    }

    // Clone player cards from active deck
    const pTeam = profile.deck
      .map((instanceId) => profile.cards.find((c) => c.instanceId === instanceId))
      .filter(Boolean)
      .map((c) => ({ ...c!, hp: c!.maxHp })); // reset hp

    // Generate opponent team based on random characters from data
    const oTeam: GameCard[] = [];
    for (let i = 0; i < 5; i++) {
      const randChar = charactersData[Math.floor(Math.random() * charactersData.length)];
      const oCard = generateGameCard(randChar);
      // Give AI some epic stats
      oCard.hp = Math.floor(oCard.hp * 0.95);
      oCard.maxHp = oCard.hp;
      oTeam.push(oCard);
    }

    setPlayerTeam(pTeam);
    setOpponentTeam(oTeam);
    setActivePlayerIdx(0);
    setActiveOpponentIdx(0);
    setLogs([
      { text: "Portal sequence complete! Entering the Battle Arena...", type: "system" },
      { text: "Match starts: Your Team vs Multiverse AI Opponent Team!", type: "system" }
    ]);
    setIsPlayerTurn(pTeam[0].speed >= oTeam[0].speed);
    setBattleActive(true);
    setBattleEnded(false);
    setVictory(false);
  };

  const addLog = (text: string, type: "system" | "player" | "opponent" | "victory" | "defeat") => {
    setLogs((prev) => [...prev, { text, type }]);
  };

  // Run AI action when it's not player's turn
  useEffect(() => {
    if (!battleActive || battleEnded || isPlayerTurn) return;

    const timer = setTimeout(() => {
      aiTurn();
    }, 1500);

    return () => clearTimeout(timer);
  }, [battleActive, battleEnded, isPlayerTurn]);

  const executeAttack = (skillIdx: number) => {
    if (!isPlayerTurn || battleEnded) return;

    const attacker = playerTeam[activePlayerIdx];
    const target = opponentTeam[activeOpponentIdx];
    const skill = attacker.skills[skillIdx];

    if (!attacker || !target) return;

    if (skill.damage > 0) {
      // Calculate Damage: DMG + rand - defense
      const randomFactor = Math.floor(Math.random() * 6) - 3;
      let rawDmg = skill.damage + randomFactor;
      let defReduction = Math.floor(target.defense * 0.3);
      let finalDmg = Math.max(5, rawDmg - defReduction);

      const nextOpponentTeam = [...opponentTeam];
      const targetHp = Math.max(0, target.hp - finalDmg);
      nextOpponentTeam[activeOpponentIdx].hp = targetHp;
      setOpponentTeam(nextOpponentTeam);

      addLog(`Your ${attacker.name} uses [${skill.name}] dealing ${finalDmg} damage to Opponent's ${target.name}!`, "player");

      if (targetHp === 0) {
        addLog(`Opponent's ${target.name} has fainted!`, "system");
        // Check if game over
        const nextIdx = activeOpponentIdx + 1;
        if (nextIdx >= opponentTeam.length) {
          // Player won
          endBattle(true);
          return;
        } else {
          setActiveOpponentIdx(nextIdx);
        }
      }
    } else if (skill.effect === "heal" && skill.effectValue) {
      const nextPlayerTeam = [...playerTeam];
      const nextHp = Math.min(attacker.maxHp, attacker.hp + skill.effectValue);
      nextPlayerTeam[activePlayerIdx].hp = nextHp;
      setPlayerTeam(nextPlayerTeam);

      addLog(`Your ${attacker.name} uses [${skill.name}] and heals for ${skill.effectValue} HP!`, "player");
    }

    setIsPlayerTurn(false);
  };

  const aiTurn = () => {
    const attacker = opponentTeam[activeOpponentIdx];
    const target = playerTeam[activePlayerIdx];

    if (!attacker || !target) return;

    // AI chooses random skill
    const skillIdx = Math.floor(Math.random() * attacker.skills.length);
    const skill = attacker.skills[skillIdx];

    if (skill.damage > 0) {
      const randomFactor = Math.floor(Math.random() * 6) - 3;
      let rawDmg = skill.damage + randomFactor;
      let defReduction = Math.floor(target.defense * 0.3);
      let finalDmg = Math.max(5, rawDmg - defReduction);

      const nextPlayerTeam = [...playerTeam];
      const targetHp = Math.max(0, target.hp - finalDmg);
      nextPlayerTeam[activePlayerIdx].hp = targetHp;
      setPlayerTeam(nextPlayerTeam);

      addLog(`Opponent's ${attacker.name} uses [${skill.name}] dealing ${finalDmg} damage to your ${target.name}!`, "opponent");

      if (targetHp === 0) {
        addLog(`Your ${target.name} has fainted!`, "system");
        const nextIdx = activePlayerIdx + 1;
        if (nextIdx >= playerTeam.length) {
          // Opponent won
          endBattle(false);
          return;
        } else {
          setActivePlayerIdx(nextIdx);
        }
      }
    } else if (skill.effect === "heal" && skill.effectValue) {
      const nextOpponentTeam = [...opponentTeam];
      const nextHp = Math.min(attacker.maxHp, attacker.hp + skill.effectValue);
      nextOpponentTeam[activeOpponentIdx].hp = nextHp;
      setOpponentTeam(nextOpponentTeam);

      addLog(`Opponent's ${attacker.name} uses [${skill.name}] and heals for ${skill.effectValue} HP!`, "opponent");
    }

    setIsPlayerTurn(true);
  };

  const endBattle = (playerWon: boolean) => {
    setBattleEnded(true);
    setVictory(playerWon);

    if (playerWon) {
      addLog("VICTORY! You defeated the Multiverse Opponent!", "victory");
      onUpdateProfile({
        coins: profile.coins + 100,
        battlesWon: profile.battlesWon + 1
      });
    } else {
      addLog("DEFEAT! Your entire deck has fainted.", "defeat");
      onUpdateProfile({
        battlesLost: profile.battlesLost + 1
      });
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case "victory": return "text-emerald-400 font-black tracking-wide uppercase";
      case "defeat": return "text-rose-500 font-black tracking-wide uppercase";
      case "player": return "text-sky-300";
      case "opponent": return "text-orange-300";
      default: return "text-slate-400";
    }
  };

  const activePlayerCard = playerTeam[activePlayerIdx];
  const activeOpponentCard = opponentTeam[activeOpponentIdx];

  return (
    <div className={`p-6 flex flex-col items-center h-full overflow-y-auto ${isDark ? "text-white" : "text-slate-800"}`}>
      <div className="text-center mb-6">
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent uppercase">
          Multiverse Battle Arena
        </h2>
        <p className="text-sm mt-1 opacity-75">
          Step into the Rick & Morty Coliseum. Fight strategic card battles to win Schmeckles!
        </p>
      </div>

      {!battleActive ? (
        <div className="max-w-md w-full text-center bg-slate-800/20 border border-slate-700/50 rounded-2xl p-8 flex flex-col items-center">
          <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center font-bold text-indigo-400 text-3xl mb-4">
            B
          </div>
          <h3 className="text-xl font-bold uppercase mb-2">Citadel Duel Arena</h3>
          <p className="text-xs opacity-75 mb-6">
            Fight turn-based battles similar to classic card games. Keep your HP above 0, defeat all 5 opposing cards, and receive 100 Schmeckles as a victory bounty.
          </p>

          <div className="bg-slate-900/50 rounded-xl p-4 w-full border border-slate-800 mb-6 text-left space-y-2">
            <div className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">Your Stats:</div>
            <div className="flex justify-between text-xs font-mono">
              <span>Battles Won:</span>
              <span className="text-emerald-400 font-bold">{profile.battlesWon}</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span>Battles Lost:</span>
              <span className="text-red-400 font-bold">{profile.battlesLost}</span>
            </div>
            <div className="flex justify-between text-xs font-mono border-t border-slate-800 pt-2">
              <span>Cards in Deck:</span>
              <span className={`font-bold ${profile.deck.length === 5 ? "text-green-400" : "text-amber-500"}`}>
                {profile.deck.length} / 5
              </span>
            </div>
          </div>

          <button
            onClick={startNewBattle}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-extrabold text-sm uppercase tracking-widest shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            Connect Portal & Battle
          </button>
        </div>
      ) : (
        <div className="w-full max-w-5xl flex flex-col gap-6">
          {/* Battle Playground */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player Active Card */}
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col items-center">
              <div className="flex justify-between items-center w-full mb-3">
                <span className="text-xs bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Your Active Gladiator
                </span>
                <span className="text-xs font-mono opacity-60">
                  Gladiator {activePlayerIdx + 1} of 5
                </span>
              </div>

              {activePlayerCard && (
                <div className="w-full flex flex-col items-center">
                  <div className="w-36 h-36 rounded-xl overflow-hidden border-2 border-sky-500/50 mb-3 shadow-lg shadow-sky-500/10">
                    <img src={activePlayerCard.image} alt={activePlayerCard.name} className="w-full h-full object-cover" />
                  </div>

                  <h4 className="text-md font-bold text-center truncate w-full uppercase mb-1">
                    {activePlayerCard.name}
                  </h4>
                  <div className="text-xs text-slate-400 font-mono mb-4">Level {activePlayerCard.level} {activePlayerCard.type}</div>

                  {/* HP Bar */}
                  <div className="w-full mb-4">
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span>Health Points:</span>
                      <span className="font-bold text-red-400">{activePlayerCard.hp} / {activePlayerCard.maxHp} HP</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                      <div
                        className="bg-red-500 h-full transition-all duration-300"
                        style={{ width: `${(activePlayerCard.hp / activePlayerCard.maxHp) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Skills (Combat Controls) */}
                  <div className="w-full">
                    <div className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">Select Attack / Skill:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activePlayerCard.skills.map((skill, i) => (
                        <button
                          key={i}
                          disabled={!isPlayerTurn || battleEnded}
                          onClick={() => executeAttack(i)}
                          className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                            isPlayerTurn && !battleEnded
                              ? "bg-slate-800/40 border-slate-700 hover:bg-slate-800 hover:border-slate-600 cursor-pointer"
                              : "bg-slate-900/20 border-slate-900 text-slate-500 cursor-not-allowed"
                          }`}
                        >
                          <div className="flex justify-between w-full text-xs font-bold">
                            <span className="text-sky-400 truncate mr-2">{skill.name}</span>
                            {skill.damage > 0 && <span className="text-red-400 font-mono">D: {skill.damage}</span>}
                          </div>
                          <p className="text-[10px] opacity-60 leading-snug mt-1">{skill.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Opponent Active Card */}
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col items-center">
              <div className="flex justify-between items-center w-full mb-3">
                <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Enemy Gladiator
                </span>
                <span className="text-xs font-mono opacity-60">
                  Gladiator {activeOpponentIdx + 1} of 5
                </span>
              </div>

              {activeOpponentCard && (
                <div className="w-full flex flex-col items-center">
                  <div className="w-36 h-36 rounded-xl overflow-hidden border-2 border-orange-500/50 mb-3 shadow-lg shadow-orange-500/10">
                    <img src={activeOpponentCard.image} alt={activeOpponentCard.name} className="w-full h-full object-cover" />
                  </div>

                  <h4 className="text-md font-bold text-center truncate w-full uppercase mb-1">
                    {activeOpponentCard.name}
                  </h4>
                  <div className="text-xs text-slate-400 font-mono mb-4">Level {activeOpponentCard.level} {activeOpponentCard.type}</div>

                  {/* HP Bar */}
                  <div className="w-full mb-4">
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span>Health Points:</span>
                      <span className="font-bold text-red-400">{activeOpponentCard.hp} / {activeOpponentCard.maxHp} HP</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                      <div
                        className="bg-red-500 h-full transition-all duration-300"
                        style={{ width: `${(activeOpponentCard.hp / activeOpponentCard.maxHp) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Opponent Action Status */}
                  <div className="w-full bg-slate-900/60 rounded-xl p-3 border border-slate-850/50 flex-1 flex flex-col items-center justify-center text-center">
                    <div className="text-xs uppercase font-extrabold tracking-wider text-slate-500 animate-pulse mb-1">
                      {isPlayerTurn ? "Analyzing strategy..." : "Deciding next attack..."}
                    </div>
                    <div className="text-[11px] opacity-70">
                      {isPlayerTurn ? "AI is waiting for your tactical decision." : "AI is initiating action trigger."}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Battle Logs Section */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col h-48">
            <div className="text-xs uppercase font-black tracking-wider text-slate-500 mb-2 pb-1.5 border-b border-slate-850/50">
              Live Battle Log Feed
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
              {logs.map((log, idx) => (
                <div key={idx} className={getLogColor(log.type)}>
                  {log.text}
                </div>
              ))}
            </div>
          </div>

          {/* Post Match Screen */}
          {battleEnded && (
            <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
              <div className="max-w-md w-full bg-slate-900 border-2 border-slate-800 p-8 rounded-2xl text-center shadow-2xl">
                <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl font-black mb-4 ${
                  victory ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}>
                  {victory ? "W" : "L"}
                </div>
                <h3 className="text-2xl font-black uppercase tracking-wider mb-2">
                  {victory ? "Victory Achieved!" : "Defeat Incurred"}
                </h3>
                <p className="text-xs opacity-70 mb-6">
                  {victory
                    ? "Fantastic! You outmaneuvered the adversary. 100 Schmeckles bounty is transferred to your account."
                    : "The enemy proved too formidable. Reconsider your battle deck assembly and try again!"}
                </p>

                <button
                  onClick={() => setBattleActive(false)}
                  className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-widest cursor-pointer"
                >
                  Return to Lobby
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
