import React from 'react';
import { MortyCard, MortyType } from '../types/game';
import { TypeBadgeIcon, getTypeLabelRu } from './TypeIcons';

interface MortyCardViewProps {
  card: MortyCard;
  onClick?: () => void;
  isSelectable?: boolean;
  isSelected?: boolean;
  scale?: 'sm' | 'md' | 'lg' | 'responsive';
}

export const MortyCardView: React.FC<MortyCardViewProps> = ({
  card,
  onClick,
  isSelectable = false,
  isSelected = false,
  scale = 'md'
}) => {
  const getScaleClasses = () => {
    switch (scale) {
      case 'sm':
        return 'w-56 text-xs p-2.5 rounded-2xl';
      case 'lg':
        return 'w-88 text-sm p-4 rounded-3xl';
      case 'responsive':
        return 'w-full max-w-xs text-xs sm:text-sm p-3 rounded-2xl';
      case 'md':
      default:
        return 'w-72 text-xs p-3 rounded-2xl';
    }
  };

  const primaryMove = card.moves[0];

  return (
    <div
      onClick={onClick}
      className={`relative select-none transition-all duration-300 transform bg-[#f5df38] border-4 border-[#eab308] text-slate-900 shadow-xl overflow-hidden flex flex-col justify-between ${getScaleClasses()} ${
        isSelectable ? 'cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:brightness-105' : ''
      } ${isSelected ? 'ring-4 ring-cyan-400 scale-105 shadow-cyan-500/50' : ''}`}
      style={{
        aspectRatio: '0.7 / 1',
        boxShadow: isSelected
          ? '0 0 25px rgba(34, 211, 238, 0.6), 0 10px 20px rgba(0,0,0,0.4)'
          : '0 10px 20px rgba(0, 0, 0, 0.35)'
      }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between font-black tracking-tight mb-1">
        <span className="truncate pr-1 text-slate-900 uppercase font-black tracking-wide font-mono text-sm sm:text-base drop-shadow-sm">
          {card.name}
        </span>
        <div className="flex items-center space-x-1 shrink-0">
          <span className="text-rose-700 font-extrabold text-sm sm:text-base font-mono">
            {card.maxHp} ОЖ
          </span>
          <div className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-bold shadow-inner">
            <TypeBadgeIcon type={card.type} className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Image Frame */}
      <div className="relative w-full h-36 sm:h-44 my-1 border-3 border-slate-900 rounded-xl overflow-hidden bg-sky-200 shadow-inner flex items-center justify-center">
        <img
          src={card.image}
          alt={card.name}
          className="w-full h-full object-cover object-center transform hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />
        {/* Card Number badge in corner */}
        <div className="absolute top-1 left-1 bg-slate-900/80 text-yellow-300 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
          #{card.number.toString().padStart(3, '0')}
        </div>
      </div>

      {/* Type Banner */}
      <div className="w-full bg-[#38bdf8] text-slate-950 font-black tracking-wider text-center py-1 my-1 rounded-lg border-2 border-slate-900 uppercase font-mono shadow-sm text-xs sm:text-sm">
        {getTypeLabelRu(card.type)}
      </div>

      {/* Attack / Move Section */}
      <div className="bg-[#fef08a] p-2 rounded-lg border-2 border-slate-900 my-1 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between font-black border-b border-slate-900/30 pb-1 mb-1">
            <div className="flex items-center space-x-1.5">
              <div className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center">
                <TypeBadgeIcon type={primaryMove.type} className="w-3.5 h-3.5" />
              </div>
              <span className="uppercase text-slate-900 font-bold tracking-tight text-xs sm:text-sm">
                {primaryMove.name}
              </span>
            </div>
            <span className="text-slate-950 font-black text-sm sm:text-base font-mono">
              {primaryMove.baseDamage}
            </span>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-800 leading-tight font-medium">
            {primaryMove.description || card.description}
          </p>
        </div>

        {/* Flavor Quote */}
        <div className="mt-2 pt-1 border-t border-slate-900/20 italic text-[9px] sm:text-[10px] text-slate-700 leading-snug">
          {card.flavorQuote}
        </div>
      </div>

      {/* Weakness Section */}
      <div className="flex items-center justify-between pt-1 border-t-2 border-slate-900/40 text-[10px] font-bold text-slate-900 uppercase tracking-wider">
        <div className="flex items-center space-x-1">
          <span className="text-slate-800">СЛАБОСТЬ</span>
          <div className="flex items-center space-x-1">
            {card.weakness.map((w: MortyType, idx: number) => (
              <div
                key={idx}
                className="w-4 h-4 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center"
                title={`Слабость к ${getTypeLabelRu(w)}`}
              >
                <TypeBadgeIcon type={w} className="w-2.5 h-2.5" />
              </div>
            ))}
          </div>
        </div>
        <span className="text-[10px] font-mono text-slate-700 bg-yellow-300/80 px-1 rounded">
          {card.rarity}
        </span>
      </div>
    </div>
  );
};
