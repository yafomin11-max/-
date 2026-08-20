import { useState } from 'react';
import { MortyCard, BattleItem, PlayerStats } from './types/game';
import { INITIAL_MORTY_CARDS } from './data/mortys';
import { MortyCardView } from './components/MortyCardView';
import { BattleArena } from './components/BattleArena';
import { Mortydex } from './components/Mortydex';
import { PortalSummon } from './components/PortalSummon';
import { GameRulesGuide } from './components/GameRulesGuide';
import { soundFX } from './utils/sound';

export default function App() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'arena' | 'mortydex' | 'portal' | 'rules'>('arena');

  // Player inventory and stats
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    schmeckles: 250,
    tickets: 3,
    dimensionBadge: 1,
    wins: 0,
    losses: 0
  });

  // Cards Collection
  const [allCards, setAllCards] = useState<MortyCard[]>(INITIAL_MORTY_CARDS);
  const [playerDeck, setPlayerDeck] = useState<MortyCard[]>(() =>
    INITIAL_MORTY_CARDS.slice(0, 3)
  );

  // Items
  const [items, setItems] = useState<BattleItem[]>([
    {
      id: 'serum-hp',
      name: 'Сыворотка Здоровья',
      description: 'Восстанавливает 100 ОЖ активному Морти.',
      type: 'HEAL',
      value: 100,
      count: 5,
      imageIcon: 'potion'
    },
    {
      id: 'capture-chip',
      name: 'Чип Поимки Морти',
      description: 'Позволяет поймать ослабленного дикого Морти.',
      type: 'CAPTURE',
      value: 1.5,
      count: 3,
      imageIcon: 'chip'
    }
  ]);

  // Audio mute state
  const [isMuted, setIsMuted] = useState(soundFX.getMuted());

  // Opponents generator for battle arena
  const [currentOpponentIndex, setCurrentOpponentIndex] = useState(0);

  const opponents = [
    {
      name: 'Рик C-137',
      deck: [INITIAL_MORTY_CARDS[1], INITIAL_MORTY_CARDS[3], INITIAL_MORTY_CARDS[4]] // Evil Morty, Robot Morty, Cronenberg
    },
    {
      name: 'Совет Риков',
      deck: [INITIAL_MORTY_CARDS[0], INITIAL_MORTY_CARDS[5], INITIAL_MORTY_CARDS[6]] // Mermaid, Cowboy, Alien
    },
    {
      name: 'Забытый Рик',
      deck: [INITIAL_MORTY_CARDS[2], INITIAL_MORTY_CARDS[7], INITIAL_MORTY_CARDS[0]] // Spork, Cop, Mermaid
    }
  ];

  const currentOpponent = opponents[currentOpponentIndex % opponents.length];

  const handleToggleAudio = () => {
    const muted = soundFX.toggleMute();
    setIsMuted(muted);
  };

  const handleUseItemInBattle = (itemId: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, count: Math.max(0, item.count - 1) } : item
      )
    );
  };

  const handleBattleEnd = (winner: 'player' | 'opponent', capturedCard?: MortyCard) => {
    if (winner === 'player') {
      setPlayerStats(prev => ({
        ...prev,
        wins: prev.wins + 1,
        schmeckles: prev.schmeckles + 150,
        tickets: prev.tickets + 1
      }));

      if (capturedCard) {
        // Add to cards if not already present
        if (!allCards.some(c => c.id === capturedCard.id)) {
          setAllCards(prev => [...prev, capturedCard]);
        }
      }

      // Next opponent
      setCurrentOpponentIndex(prev => prev + 1);
    } else {
      setPlayerStats(prev => ({
        ...prev,
        losses: prev.losses + 1,
        schmeckles: Math.max(0, prev.schmeckles - 30)
      }));
    }
  };

  const handleSummonSuccess = (newCard: MortyCard, cost: { type: 'schmeckles' | 'tickets'; amount: number }) => {
    // Deduct cost
    setPlayerStats(prev => ({
      ...prev,
      schmeckles: cost.type === 'schmeckles' ? prev.schmeckles - cost.amount : prev.schmeckles,
      tickets: cost.type === 'tickets' ? prev.tickets - cost.amount : prev.tickets
    }));

    // Add card to collection
    if (!allCards.some(c => c.id === newCard.id)) {
      setAllCards(prev => [...prev, newCard]);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans flex flex-col justify-between selection:bg-yellow-400 selection:text-slate-900 pb-12">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b-4 border-yellow-400 px-4 py-3 shadow-xl">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-yellow-400 border-2 border-slate-900 flex items-center justify-center font-black text-slate-950 text-xl font-mono shadow-md">
              M
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-yellow-400 uppercase drop-shadow">
                ПОКЕМОРТИ
              </h1>
              <p className="text-[10px] sm:text-xs font-mono text-cyan-400 uppercase">
                Карточная игра Рик и Морти • Цитадель Риков
              </p>
            </div>
          </div>

          {/* Stats & Currencies Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 font-mono text-xs">
            <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center space-x-2">
              <span className="text-emerald-400 font-bold">Шмекли:</span>
              <span className="text-slate-100 font-black">{playerStats.schmeckles}</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center space-x-2">
              <span className="text-cyan-400 font-bold">Билеты:</span>
              <span className="text-slate-100 font-black">{playerStats.tickets}</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center space-x-2">
              <span className="text-yellow-400 font-bold">Победы:</span>
              <span className="text-slate-100 font-black">{playerStats.wins}В / {playerStats.losses}П</span>
            </div>

            {/* Mute Button */}
            <button
              onClick={handleToggleAudio}
              className="bg-slate-800 hover:bg-slate-700 text-yellow-400 px-3 py-1.5 rounded-xl font-mono text-xs font-bold border border-yellow-400/40"
            >
              Звук: {isMuted ? 'ВКЛ' : 'ВЫКЛ'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content View Switcher */}
      <main className="max-w-6xl mx-auto w-full px-4 pt-6 flex-1">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6 font-mono text-xs sm:text-sm font-bold uppercase">
          <button
            onClick={() => {
              soundFX.playSelect();
              setActiveTab('arena');
            }}
            className={`px-4 py-2.5 rounded-2xl border-2 transition shadow-lg ${
              activeTab === 'arena'
                ? 'bg-yellow-400 text-slate-950 border-yellow-300 scale-105'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            Битва в Цитадели
          </button>

          <button
            onClick={() => {
              soundFX.playSelect();
              setActiveTab('mortydex');
            }}
            className={`px-4 py-2.5 rounded-2xl border-2 transition shadow-lg ${
              activeTab === 'mortydex'
                ? 'bg-yellow-400 text-slate-950 border-yellow-300 scale-105'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            Мортидекс ({allCards.length})
          </button>

          <button
            onClick={() => {
              soundFX.playSelect();
              setActiveTab('portal');
            }}
            className={`px-4 py-2.5 rounded-2xl border-2 transition shadow-lg ${
              activeTab === 'portal'
                ? 'bg-yellow-400 text-slate-950 border-yellow-300 scale-105'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            Портал Призыва
          </button>

          <button
            onClick={() => {
              soundFX.playSelect();
              setActiveTab('rules');
            }}
            className={`px-4 py-2.5 rounded-2xl border-2 transition shadow-lg ${
              activeTab === 'rules'
                ? 'bg-yellow-400 text-slate-950 border-yellow-300 scale-105'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            Правила Игры
          </button>
        </div>

        {/* View Component Render */}
        {activeTab === 'arena' && (
          <BattleArena
            key={currentOpponentIndex}
            playerDeck={playerDeck}
            opponentDeck={currentOpponent.deck}
            opponentName={currentOpponent.name}
            items={items}
            onBattleEnd={handleBattleEnd}
            onUseItemInBattle={handleUseItemInBattle}
          />
        )}

        {activeTab === 'mortydex' && (
          <Mortydex
            allCards={allCards}
            playerDeck={playerDeck}
            onUpdateDeck={setPlayerDeck}
          />
        )}

        {activeTab === 'portal' && (
          <PortalSummon
            availablePool={INITIAL_MORTY_CARDS}
            schmeckles={playerStats.schmeckles}
            tickets={playerStats.tickets}
            onSummonSuccess={handleSummonSuccess}
          />
        )}

        {activeTab === 'rules' && <GameRulesGuide />}

        {/* Quick Reference Showcase Bar at bottom */}
        <div className="mt-12 bg-slate-900/60 border border-slate-800 p-4 rounded-3xl">
          <h3 className="text-xs font-mono font-bold text-yellow-400 uppercase mb-3 text-center">
            Коллекционные карточки ПокеМорти (Примеры из книги):
          </h3>
          <div className="flex items-center justify-center gap-4 overflow-x-auto py-2">
            {INITIAL_MORTY_CARDS.slice(0, 4).map(card => (
              <div key={card.id} className="shrink-0 transform hover:scale-105 transition">
                <MortyCardView card={card} scale="sm" />
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 text-center text-[11px] font-mono text-slate-500">
        ПокеМорти Карточная Игра • Измерение C-137
      </footer>
    </div>
  );
}
