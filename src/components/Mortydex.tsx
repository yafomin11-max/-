import React, { useState } from 'react';
import { MortyCard, MortyType } from '../types/game';
import { MortyCardView } from './MortyCardView';
import { TypeBadgeIcon, getTypeLabelRu } from './TypeIcons';
import { soundFX } from '../utils/sound';

interface MortydexProps {
  allCards: MortyCard[];
  playerDeck: MortyCard[];
  onUpdateDeck: (newDeck: MortyCard[]) => void;
}

export const Mortydex: React.FC<MortydexProps> = ({
  allCards,
  playerDeck,
  onUpdateDeck
}) => {
  const [filterType, setFilterType] = useState<MortyType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewCard, setPreviewCard] = useState<MortyCard | null>(allCards[0] || null);

  const isCardInDeck = (cardId: string) => {
    return playerDeck.some(c => c.id === cardId);
  };

  const handleToggleDeckCard = (card: MortyCard) => {
    soundFX.playSelect();
    if (isCardInDeck(card.id)) {
      if (playerDeck.length <= 1) {
        alert('В вашей колоде должен оставаться хотя бы один Морти!');
        return;
      }
      onUpdateDeck(playerDeck.filter(c => c.id !== card.id));
    } else {
      if (playerDeck.length >= 5) {
        alert('В колоде может быть максимум 5 Морти!');
        return;
      }
      onUpdateDeck([...playerDeck, card]);
    }
  };

  const filteredCards = allCards.filter(card => {
    const matchesType = filterType === 'ALL' || card.type === filterType;
    const matchesSearch = card.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col space-y-6">
      {/* Active Deck Header Bar */}
      <div className="bg-slate-900 border-4 border-yellow-400 p-4 sm:p-6 rounded-3xl shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black font-mono uppercase text-yellow-400 flex items-center space-x-2">
              <span>Боевая Команда Морти</span>
              <span className="text-sm bg-yellow-400 text-slate-950 px-2 py-0.5 rounded-full">
                {playerDeck.length} / 5
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Выберите от 1 до 5 Морти для сражений с другими Риками в Цитадели.
            </p>
          </div>
        </div>

        {/* Selected Deck Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {playerDeck.map(card => (
            <div
              key={card.id}
              onClick={() => handleToggleDeckCard(card)}
              className="relative group cursor-pointer bg-slate-800 border-2 border-cyan-400 p-2 rounded-2xl hover:border-rose-500 transition shadow-lg flex flex-col items-center text-center"
            >
              <img
                src={card.image}
                alt={card.name}
                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl mb-1 border border-slate-700"
              />
              <span className="text-[11px] font-mono font-bold text-slate-200 truncate w-full">
                {card.name}
              </span>
              <div className="flex items-center space-x-1 mt-1">
                <TypeBadgeIcon type={card.type} className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] text-rose-400 font-mono font-bold">
                  {card.maxHp} HP
                </span>
              </div>
              <div className="absolute top-1 right-1 bg-rose-600 text-white text-[9px] font-mono px-1 rounded opacity-0 group-hover:opacity-100 transition">
                Убрать
              </div>
            </div>
          ))}

          {/* Empty slot placeholders */}
          {Array.from({ length: 5 - playerDeck.length }).map((_, idx) => (
            <div
              key={idx}
              className="border-2 border-dashed border-slate-700 rounded-2xl h-24 sm:h-28 flex flex-col items-center justify-center text-slate-600 font-mono text-xs"
            >
              <span>Слот #{playerDeck.length + idx + 1}</span>
              <span className="text-[10px] opacity-60">Пусто</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mortydex Collection Catalog */}
      <div className="bg-slate-900 border-2 border-slate-800 p-4 sm:p-6 rounded-3xl shadow-2xl flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <h3 className="text-lg font-black font-mono uppercase text-slate-100">
            Мортидекс (Коллекция Морти):
          </h3>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Поиск по имени..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-100 px-3 py-1.5 rounded-xl font-mono text-xs focus:outline-none focus:border-yellow-400 w-44"
            />

            {(['ALL', 'ROCK', 'PAPER', 'SCISSORS', 'ANY'] as const).map(type => (
              <button
                key={type}
                onClick={() => {
                  soundFX.playSelect();
                  setFilterType(type);
                }}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold uppercase transition flex items-center space-x-1 ${
                  filterType === type
                    ? 'bg-yellow-400 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {type === 'ALL' ? 'Все' : getTypeLabelRu(type)}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Grid + Detailed Preview Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Left / Middle: Grid of Morty Cards */}
          <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredCards.map(card => {
              const inDeck = isCardInDeck(card.id);
              return (
                <div
                  key={card.id}
                  onClick={() => setPreviewCard(card)}
                  className={`relative p-3 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    previewCard?.id === card.id
                      ? 'border-yellow-400 bg-slate-800'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={card.image}
                      alt={card.name}
                      className="w-14 h-14 object-cover rounded-xl border border-slate-700 shrink-0"
                    />
                    <div className="min-w-0 font-mono">
                      <div className="font-bold text-xs text-slate-200 truncate">
                        {card.name}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                        <TypeBadgeIcon type={card.type} className="w-3 h-3 text-cyan-400" />
                        <span>{getTypeLabelRu(card.type)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-2">
                    <span className="text-[10px] font-mono text-rose-400 font-bold">
                      {card.maxHp} HP
                    </span>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleToggleDeckCard(card);
                      }}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-lg font-bold transition uppercase ${
                        inDeck
                          ? 'bg-rose-600 hover:bg-rose-500 text-white'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                      }`}
                    >
                      {inDeck ? 'Взято' : '+ В Колоду'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Detailed Reference Card Preview */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-3xl flex flex-col items-center justify-center shadow-xl">
            {previewCard ? (
              <div className="flex flex-col items-center space-y-3">
                <div className="text-xs font-mono text-slate-400 font-bold uppercase">
                  Просмотр карточки в реальном стиле:
                </div>
                <MortyCardView card={previewCard} scale="responsive" />
              </div>
            ) : (
              <div className="text-slate-500 font-mono text-xs">Выберите Морти из списка</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
