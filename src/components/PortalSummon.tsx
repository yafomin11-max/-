import React, { useState } from 'react';
import { MortyCard } from '../types/game';
import { MortyCardView } from './MortyCardView';
import { soundFX } from '../utils/sound';

interface PortalSummonProps {
  availablePool: MortyCard[];
  schmeckles: number;
  tickets: number;
  onSummonSuccess: (newMorty: MortyCard, cost: { type: 'schmeckles' | 'tickets'; amount: number }) => void;
}

export const PortalSummon: React.FC<PortalSummonProps> = ({
  availablePool,
  schmeckles,
  tickets,
  onSummonSuccess
}) => {
  const [isOpening, setIsOpening] = useState(false);
  const [summonedCard, setSummonedCard] = useState<MortyCard | null>(null);

  const handleSummon = (paymentType: 'schmeckles' | 'tickets') => {
    const cost = paymentType === 'schmeckles' ? 100 : 1;
    if (paymentType === 'schmeckles' && schmeckles < cost) {
      alert('Недостаточно Шмеклей! Победите Риков в боях, чтобы заработать.');
      return;
    }
    if (paymentType === 'tickets' && tickets < cost) {
      alert('Недостаточно Билетов Цитадели!');
      return;
    }

    soundFX.playPortalOpen();
    setIsOpening(true);
    setSummonedCard(null);

    // Random roll from available cards
    const randomIndex = Math.floor(Math.random() * availablePool.length);
    const rewardCard = availablePool[randomIndex];

    setTimeout(() => {
      setIsOpening(false);
      setSummonedCard(rewardCard);
      soundFX.playVictory();
      onSummonSuccess(rewardCard, { type: paymentType, amount: cost });
    }, 2200);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center space-y-6 text-center">
      <div className="bg-slate-900 border-4 border-yellow-400 p-6 sm:p-8 rounded-3xl shadow-2xl w-full flex flex-col items-center">
        <h2 className="text-2xl sm:text-3xl font-black font-mono uppercase text-yellow-400 mb-2 tracking-wide">
          Межпространственный Портал
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 font-mono max-w-lg mb-6">
          Откройте зеленый квантовый портал Рика C-137, чтобы призвать случайного ПокеМорти из альтернативной реальности!
        </p>

        {/* Portal Animation Area */}
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 my-4 flex items-center justify-center">
          {/* Animated Green Portal Glow */}
          <div
            className={`absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500 via-green-400 to-teal-300 opacity-80 blur-xl ${
              isOpening ? 'animate-ping duration-700' : 'animate-pulse duration-1000'
            }`}
          />

          {/* Portal Vortex Ring */}
          <div
            className={`relative w-full h-full rounded-full border-8 border-emerald-400 border-dashed flex items-center justify-center shadow-[0_0_50px_rgba(52,211,153,0.6)] bg-slate-950 overflow-hidden ${
              isOpening ? 'animate-spin duration-300' : 'animate-spin duration-[10000ms]'
            }`}
          >
            <div className="w-3/4 h-3/4 rounded-full border-4 border-teal-300 border-dotted animate-ping" />
          </div>

          {/* Summon Overlay Card or Spin Effect */}
          {isOpening && (
            <div className="absolute inset-0 flex items-center justify-center text-emerald-300 font-mono font-black text-lg animate-bounce z-10">
              Поиск измерения...
            </div>
          )}

          {summonedCard && !isOpening && (
            <div className="absolute inset-0 z-20 flex items-center justify-center transform scale-110 animate-fade-in">
              <MortyCardView card={summonedCard} scale="sm" />
            </div>
          )}
        </div>

        {/* Summon Buttons & Cost */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md mt-6">
          <button
            disabled={isOpening || schmeckles < 100}
            onClick={() => handleSummon('schmeckles')}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-black p-4 rounded-2xl font-mono uppercase tracking-wider transition shadow-lg flex flex-col items-center justify-center"
          >
            <span>Призвать за Шмекли</span>
            <span className="text-xs text-slate-900 font-bold mt-1">100 Шмеклей</span>
          </button>

          <button
            disabled={isOpening || tickets < 1}
            onClick={() => handleSummon('tickets')}
            className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-black p-4 rounded-2xl font-mono uppercase tracking-wider transition shadow-lg flex flex-col items-center justify-center"
          >
            <span>Призвать за Билет</span>
            <span className="text-xs text-slate-900 font-bold mt-1">1 Билет Цитадели</span>
          </button>
        </div>

        {summonedCard && (
          <div className="mt-6 bg-slate-800 border border-yellow-400 p-4 rounded-2xl font-mono text-sm text-yellow-300 font-bold animate-pulse">
            Поздравляем! Добавлен в Мортидекс: {summonedCard.name}!
          </div>
        )}
      </div>
    </div>
  );
};
