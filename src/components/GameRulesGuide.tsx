import React from 'react';
import { TypeBadgeIcon } from './TypeIcons';

interface GameRulesGuideProps {
  onClose?: () => void;
}

export const GameRulesGuide: React.FC<GameRulesGuideProps> = ({ onClose }) => {
  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900 border-4 border-yellow-400 p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col space-y-6 text-slate-100 font-sans">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black font-mono uppercase text-yellow-400">
            Правила Игры & Таблица Эффективности
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Официальное руководство Рика C-137 по боям ПокеМорти в Цитадели.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-yellow-400 font-mono font-bold px-3 py-1.5 rounded-xl border border-yellow-400/50 text-xs"
          >
            Закрыть
          </button>
        )}
      </div>

      {/* Type Triangle System */}
      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col space-y-3">
        <h3 className="text-sm font-mono font-bold text-yellow-400 uppercase">
          1. Взаимодействие Типов (Камень, Ножницы, Бумага):
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed font-mono">
          Каждый ПокеМорти относится к одному из базовых типов. Урон атаки умножается на <strong className="text-yellow-400">1.5x (Супер-эффективно)</strong> или снижается до <strong className="text-rose-400">0.7x (Недостаточно эффективно)</strong>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Rock */}
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col items-center text-center">
            <div className="w-8 h-8 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center mb-2">
              <TypeBadgeIcon type="ROCK" className="w-5 h-5" />
            </div>
            <span className="font-mono font-bold text-xs text-yellow-400">КАМЕНЬ</span>
            <span className="text-[11px] text-emerald-400 font-mono mt-1">Силен против: Ножницы</span>
            <span className="text-[11px] text-rose-400 font-mono">Слаб против: Бумага</span>
          </div>

          {/* Scissors */}
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col items-center text-center">
            <div className="w-8 h-8 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center mb-2">
              <TypeBadgeIcon type="SCISSORS" className="w-5 h-5" />
            </div>
            <span className="font-mono font-bold text-xs text-yellow-400">НОЖНИЦЫ</span>
            <span className="text-[11px] text-emerald-400 font-mono mt-1">Силен против: Бумага</span>
            <span className="text-[11px] text-rose-400 font-mono">Слаб против: Камень</span>
          </div>

          {/* Paper */}
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col items-center text-center">
            <div className="w-8 h-8 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center mb-2">
              <TypeBadgeIcon type="PAPER" className="w-5 h-5" />
            </div>
            <span className="font-mono font-bold text-xs text-yellow-400">БУМАГА</span>
            <span className="text-[11px] text-emerald-400 font-mono mt-1">Силен против: Камень</span>
            <span className="text-[11px] text-rose-400 font-mono">Слаб против: Ножницы</span>
          </div>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center space-x-3 mt-2">
          <div className="w-7 h-7 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shrink-0">
            <TypeBadgeIcon type="ANY" className="w-4 h-4" />
          </div>
          <div className="text-xs font-mono text-slate-300">
            <strong className="text-yellow-400">ЧТО УГОДНО (Нейтральный тип):</strong> Универсальный тип без прямых слабостей и бонусов преимущества.
          </div>
        </div>
      </div>

      {/* Battle Mechanics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <h4 className="text-xs font-mono font-bold text-yellow-400 uppercase mb-2">
            2. Ход Битвы:
          </h4>
          <ul className="text-xs text-slate-300 space-y-2 font-mono list-disc list-inside">
            <li>В боях участвуют команды из 5 ПокеМорти.</li>
            <li>Игроки по очереди совершают атаки или смену активного Морти.</li>
            <li>Побеждает тот, кто первым лишит ОЖ (HP) всех Морти противника.</li>
            <li>Критический удар (15% шанс) наносит 1.5x дополнительного урона!</li>
          </ul>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <h4 className="text-xs font-mono font-bold text-yellow-400 uppercase mb-2">
            3. Предметы и Портал:
          </h4>
          <ul className="text-xs text-slate-300 space-y-2 font-mono list-disc list-inside">
            <li><strong className="text-emerald-400">Сыворотка:</strong> Восстанавливает здоровье Морти в бою.</li>
            <li><strong className="text-cyan-400">Чип поимки:</strong> Позволяет поймать дикого Морти во время боя.</li>
            <li>За победы в Цитадели вы получаете <strong className="text-yellow-400">Шмекли</strong> и <strong className="text-cyan-400">Билеты</strong> для призыва новых карт через Межпространственный Портал!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
