import React, { useState } from 'react';
import { MortyCard, BattleItem } from '../types/game';
import { ActiveMorty, BattleLogEntry, calculateDamage, selectAiMove } from '../utils/battleEngine';
import { TypeBadgeIcon } from './TypeIcons';
import { soundFX } from '../utils/sound';

interface BattleArenaProps {
  playerDeck: MortyCard[];
  opponentDeck: MortyCard[];
  opponentName: string;
  items: BattleItem[];
  onBattleEnd: (winner: 'player' | 'opponent', capturedCard?: MortyCard) => void;
  onUseItemInBattle: (itemId: string) => void;
}

export const BattleArena: React.FC<BattleArenaProps> = ({
  playerDeck,
  opponentDeck,
  opponentName,
  items,
  onBattleEnd,
  onUseItemInBattle
}) => {
  // Battle state
  const [playerTeam, setPlayerTeam] = useState<ActiveMorty[]>(() =>
    playerDeck.map(card => ({ card, currentHp: card.maxHp }))
  );
  const [opponentTeam, setOpponentTeam] = useState<ActiveMorty[]>(() =>
    opponentDeck.map(card => ({ card, currentHp: card.maxHp }))
  );

  const [activePlayerIdx, setActivePlayerIdx] = useState(0);
  const [activeOpponentIdx, setActiveOpponentIdx] = useState(0);

  const [turn, setTurn] = useState<'player' | 'opponent' | 'animating'>('player');
  const [logs, setLogs] = useState<BattleLogEntry[]>([
    {
      id: 'init',
      text: `Битва началась против ${opponentName}! Выберите атаку или действие.`,
      type: 'system',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [damagePopup, setDamagePopup] = useState<{ target: 'player' | 'opponent'; text: string } | null>(null);

  const activePlayer = playerTeam[activePlayerIdx];
  const activeOpponent = opponentTeam[activeOpponentIdx];

  const addLog = (text: string, type: BattleLogEntry['type']) => {
    setLogs(prev => [
      {
        id: Math.random().toString(),
        text,
        type,
        timestamp: new Date().toLocaleTimeString()
      },
      ...prev
    ]);
  };

  const triggerDamagePopup = (target: 'player' | 'opponent', text: string) => {
    setDamagePopup({ target, text });
    setTimeout(() => setDamagePopup(null), 1200);
  };

  // Handle Player attack
  const handlePlayerAttack = (moveIndex: number) => {
    if (turn !== 'player' || !activePlayer || !activeOpponent) return;

    const move = activePlayer.card.moves[moveIndex];
    if (!move) return;

    setTurn('animating');
    soundFX.playAttack();

    const result = calculateDamage(activePlayer.card, move, activeOpponent.card);

    if (result.multiplier > 1.0) {
      soundFX.playSuperEffective();
    }

    addLog(
      `${activePlayer.card.name} использует [${move.name}]! Нанесено ${result.damage} урона. ${result.isCrit ? 'КРИТИЧЕСКИЙ УДАР! ' : ''}${result.advantageLabel}`,
      result.multiplier > 1.0 ? 'effective' : 'player'
    );

    triggerDamagePopup('opponent', `-${result.damage} HP`);

    // Update opponent HP
    const newOpponentHp = Math.max(0, activeOpponent.currentHp - result.damage);
    const updatedOpponentTeam = [...opponentTeam];
    updatedOpponentTeam[activeOpponentIdx] = {
      ...activeOpponent,
      currentHp: newOpponentHp
    };
    setOpponentTeam(updatedOpponentTeam);

    // Check if opponent Morty fainted
    if (newOpponentHp <= 0) {
      addLog(`${activeOpponent.card.name} повержен!`, 'system');

      // Check if next opponent Morty exists
      const nextOpponentIdx = updatedOpponentTeam.findIndex(m => m.currentHp > 0);
      if (nextOpponentIdx === -1) {
        soundFX.playVictory();
        addLog(`Победа! Вы одолели всех ПокеМорти противника ${opponentName}!`, 'system');
        setTimeout(() => {
          onBattleEnd('player');
        }, 1800);
        return;
      } else {
        setTimeout(() => {
          setActiveOpponentIdx(nextOpponentIdx);
          addLog(`${opponentName} выставляет ${updatedOpponentTeam[nextOpponentIdx].card.name}!`, 'opponent');
          setTurn('player');
        }, 1200);
        return;
      }
    }

    // Opponent turn after delay
    setTimeout(() => {
      executeOpponentTurn(updatedOpponentTeam[activeOpponentIdx], activePlayer);
    }, 1200);
  };

  // Opponent Turn AI
  const executeOpponentTurn = (currentOpponent: ActiveMorty, currentPlayer: ActiveMorty) => {
    if (currentPlayer.currentHp <= 0) return;

    setTurn('animating');
    const move = selectAiMove(currentOpponent, currentPlayer);
    soundFX.playAttack();

    const result = calculateDamage(currentOpponent.card, move, currentPlayer.card);

    addLog(
      `${currentOpponent.card.name} противника использует [${move.name}]! Нанесено ${result.damage} урона.`,
      'opponent'
    );

    triggerDamagePopup('player', `-${result.damage} HP`);

    const newPlayerHp = Math.max(0, currentPlayer.currentHp - result.damage);
    const updatedPlayerTeam = [...playerTeam];
    updatedPlayerTeam[activePlayerIdx] = {
      ...currentPlayer,
      currentHp: newPlayerHp
    };
    setPlayerTeam(updatedPlayerTeam);

    if (newPlayerHp <= 0) {
      addLog(`Ваш ${currentPlayer.card.name} потерял сознание!`, 'system');

      const nextPlayerIdx = updatedPlayerTeam.findIndex(m => m.currentHp > 0);
      if (nextPlayerIdx === -1) {
        soundFX.playDefeat();
        addLog(`Поражение! Все ваши Морти повержены...`, 'system');
        setTimeout(() => {
          onBattleEnd('opponent');
        }, 1800);
        return;
      } else {
        setShowSwitchModal(true);
        setTurn('player');
        return;
      }
    }

    setTurn('player');
  };

  // Handle Switch Morty
  const handleSwitchMorty = (newIdx: number) => {
    if (newIdx === activePlayerIdx || playerTeam[newIdx].currentHp <= 0) return;

    soundFX.playSelect();
    setActivePlayerIdx(newIdx);
    setShowSwitchModal(false);
    addLog(`Вы отправили в бой ${playerTeam[newIdx].card.name}!`, 'player');

    // Switching consumes a turn unless active was fainted
    if (activePlayer.currentHp > 0) {
      setTurn('animating');
      setTimeout(() => {
        executeOpponentTurn(activeOpponent, playerTeam[newIdx]);
      }, 1000);
    } else {
      setTurn('player');
    }
  };

  // Handle Item Use
  const handleUseItem = (item: BattleItem) => {
    if (item.count <= 0 || turn !== 'player') return;

    if (item.type === 'HEAL') {
      soundFX.playHeal();
      const healAmount = item.value;
      const newHp = Math.min(activePlayer.card.maxHp, activePlayer.currentHp + healAmount);
      const actualHealed = newHp - activePlayer.currentHp;

      const updatedPlayerTeam = [...playerTeam];
      updatedPlayerTeam[activePlayerIdx] = {
        ...activePlayer,
        currentHp: newHp
      };
      setPlayerTeam(updatedPlayerTeam);
      onUseItemInBattle(item.id);

      addLog(`Вы использовали ${item.name}! Восстановлено ${actualHealed} ОЖ у ${activePlayer.card.name}.`, 'item');
      triggerDamagePopup('player', `+${actualHealed} HP`);
      setShowItemsModal(false);

      setTurn('animating');
      setTimeout(() => {
        executeOpponentTurn(activeOpponent, updatedPlayerTeam[activePlayerIdx]);
      }, 1200);
    } else if (item.type === 'CAPTURE') {
      soundFX.playPortalOpen();
      setShowItemsModal(false);
      onUseItemInBattle(item.id);

      // Catch chance calculation based on target HP percentage
      const hpPercent = activeOpponent.currentHp / activeOpponent.card.maxHp;
      const catchChance = Math.max(0.2, (1 - hpPercent) * item.value);

      if (Math.random() < catchChance) {
        soundFX.playVictory();
        addLog(`Ура! Вы успешно поймали ${activeOpponent.card.name}!`, 'system');
        setTimeout(() => {
          onBattleEnd('player', activeOpponent.card);
        }, 1800);
      } else {
        addLog(`Черт! ${activeOpponent.card.name} вырвался из чипа поимки!`, 'system');
        setTurn('animating');
        setTimeout(() => {
          executeOpponentTurn(activeOpponent, activePlayer);
        }, 1200);
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col space-y-4">
      {/* Top Header & Turn Status */}
      <div className="flex items-center justify-between bg-slate-900 border-2 border-slate-800 p-3 rounded-2xl shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-slate-200 uppercase font-mono tracking-wider text-xs sm:text-sm">
            Арена Цитадели: {opponentName}
          </span>
        </div>
        <span
          className={`px-3 py-1 rounded-full font-bold font-mono text-xs uppercase ${
            turn === 'player'
              ? 'bg-yellow-400 text-slate-950 animate-bounce'
              : 'bg-rose-600 text-slate-100'
          }`}
        >
          {turn === 'player' ? 'Ваш Ход' : 'Ход Противника'}
        </span>
      </div>

      {/* Main Battle Scene */}
      <div className="relative w-full h-80 sm:h-96 rounded-3xl border-4 border-yellow-400/80 bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 shadow-2xl overflow-hidden flex flex-col justify-between p-4 sm:p-6">
        {/* Opponent Field (Top Right) */}
        <div className="relative flex justify-end items-start w-full">
          <div className="bg-slate-900/90 border-2 border-yellow-400/60 p-3 rounded-2xl w-56 sm:w-64 shadow-xl backdrop-blur">
            <div className="flex justify-between items-center mb-1 font-mono font-bold">
              <span className="text-yellow-400 text-xs sm:text-sm truncate mr-1">
                {activeOpponent.card.name}
              </span>
              <div className="flex items-center space-x-1 shrink-0">
                <span className="text-xs text-rose-400">
                  {activeOpponent.currentHp}/{activeOpponent.card.maxHp}
                </span>
                <TypeBadgeIcon type={activeOpponent.card.type} className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            {/* Health Bar */}
            <div className="w-full bg-slate-800 rounded-full h-3 border border-slate-700 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  activeOpponent.currentHp / activeOpponent.card.maxHp > 0.5
                    ? 'bg-emerald-500'
                    : activeOpponent.currentHp / activeOpponent.card.maxHp > 0.2
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${(activeOpponent.currentHp / activeOpponent.card.maxHp) * 100}%` }}
              />
            </div>
          </div>

          {/* Opponent Sprite */}
          <div className="relative ml-4 w-28 h-28 sm:w-36 sm:h-36 shrink-0">
            <img
              src={activeOpponent.card.image}
              alt={activeOpponent.card.name}
              className="w-full h-full object-cover rounded-2xl border-2 border-rose-500/80 shadow-lg shadow-rose-950/50"
            />
            {damagePopup?.target === 'opponent' && (
              <div className="absolute top-0 right-0 bg-rose-600 text-white font-black px-2 py-1 rounded-lg animate-bounce shadow-lg text-sm font-mono">
                {damagePopup.text}
              </div>
            )}
          </div>
        </div>

        {/* Player Field (Bottom Left) */}
        <div className="relative flex justify-start items-end w-full">
          {/* Player Sprite */}
          <div className="relative mr-4 w-28 h-28 sm:w-36 sm:h-36 shrink-0">
            <img
              src={activePlayer.card.image}
              alt={activePlayer.card.name}
              className="w-full h-full object-cover rounded-2xl border-2 border-emerald-500/80 shadow-lg shadow-emerald-950/50"
            />
            {damagePopup?.target === 'player' && (
              <div className="absolute top-0 left-0 bg-rose-600 text-white font-black px-2 py-1 rounded-lg animate-bounce shadow-lg text-sm font-mono">
                {damagePopup.text}
              </div>
            )}
          </div>

          <div className="bg-slate-900/90 border-2 border-yellow-400/60 p-3 rounded-2xl w-56 sm:w-64 shadow-xl backdrop-blur">
            <div className="flex justify-between items-center mb-1 font-mono font-bold">
              <span className="text-yellow-400 text-xs sm:text-sm truncate mr-1">
                {activePlayer.card.name}
              </span>
              <div className="flex items-center space-x-1 shrink-0">
                <span className="text-xs text-emerald-400">
                  {activePlayer.currentHp}/{activePlayer.card.maxHp}
                </span>
                <TypeBadgeIcon type={activePlayer.card.type} className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            {/* Health Bar */}
            <div className="w-full bg-slate-800 rounded-full h-3 border border-slate-700 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  activePlayer.currentHp / activePlayer.card.maxHp > 0.5
                    ? 'bg-emerald-500'
                    : activePlayer.currentHp / activePlayer.card.maxHp > 0.2
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${(activePlayer.currentHp / activePlayer.card.maxHp) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar & Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left: Attacks Panel */}
        <div className="md:col-span-2 bg-slate-900 border-2 border-slate-800 p-4 rounded-3xl shadow-xl flex flex-col justify-between">
          <div className="text-xs font-mono text-yellow-400 uppercase font-bold mb-2">
            Выберите атаку Морти:
          </div>
          <div className="grid grid-cols-2 gap-2">
            {activePlayer.card.moves.map((move, idx) => (
              <button
                key={move.id}
                disabled={turn !== 'player' || activePlayer.currentHp <= 0}
                onClick={() => handlePlayerAttack(idx)}
                className="group relative bg-slate-800 hover:bg-yellow-400 hover:text-slate-950 text-slate-100 p-3 rounded-2xl border-2 border-slate-700 hover:border-yellow-300 font-bold text-left transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs sm:text-sm uppercase font-black">
                    {move.name}
                  </span>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-900/60 group-hover:bg-slate-950 group-hover:text-yellow-300">
                    Урон: {move.baseDamage}
                  </span>
                </div>
                <div className="text-[10px] opacity-80 line-clamp-1 font-sans">
                  {move.description}
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-slate-800">
            <button
              disabled={turn !== 'player'}
              onClick={() => {
                soundFX.playSelect();
                setShowSwitchModal(true);
              }}
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold py-2 px-3 rounded-xl transition text-xs sm:text-sm font-mono uppercase shadow-md disabled:opacity-50"
            >
              Сменить Морти
            </button>
            <button
              disabled={turn !== 'player'}
              onClick={() => {
                soundFX.playSelect();
                setShowItemsModal(true);
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-2 px-3 rounded-xl transition text-xs sm:text-sm font-mono uppercase shadow-md disabled:opacity-50"
            >
              Предметы
            </button>
          </div>
        </div>

        {/* Right: Battle Log */}
        <div className="bg-slate-900 border-2 border-slate-800 p-3 rounded-3xl shadow-xl flex flex-col h-56 md:h-auto overflow-hidden">
          <div className="text-xs font-mono text-slate-400 font-bold uppercase mb-2">
            Журнал Битвы:
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs font-mono">
            {logs.map(log => (
              <div
                key={log.id}
                className={`p-2 rounded-lg border ${
                  log.type === 'effective'
                    ? 'bg-yellow-950/40 border-yellow-500/50 text-yellow-300'
                    : log.type === 'player'
                    ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200'
                    : log.type === 'opponent'
                    ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                    : log.type === 'item'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300'
                }`}
              >
                <span className="text-[10px] opacity-60 mr-1.5">[{log.timestamp}]</span>
                {log.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Switch Morty Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-4 border-yellow-400 p-6 rounded-3xl max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-black font-mono uppercase text-yellow-400 mb-4">
              Выберите Морти для замены:
            </h3>
            <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
              {playerTeam.map((member, idx) => (
                <button
                  key={idx}
                  disabled={idx === activePlayerIdx || member.currentHp <= 0}
                  onClick={() => handleSwitchMorty(idx)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 transition ${
                    idx === activePlayerIdx
                      ? 'border-cyan-500 bg-cyan-950/40 opacity-70'
                      : member.currentHp <= 0
                      ? 'border-slate-800 bg-slate-950/50 opacity-40 cursor-not-allowed'
                      : 'border-slate-700 bg-slate-800 hover:border-yellow-400 hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={member.card.image}
                      alt={member.card.name}
                      className="w-12 h-12 object-cover rounded-xl"
                    />
                    <div className="text-left font-mono">
                      <div className="font-bold text-slate-200 text-sm">
                        {member.card.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {getTypeLabel(member.card.type)}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono text-xs font-bold text-emerald-400">
                    {member.currentHp} / {member.card.maxHp} HP
                  </div>
                </button>
              ))}
            </div>
            {activePlayer.currentHp > 0 && (
              <button
                onClick={() => setShowSwitchModal(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold py-2 rounded-xl"
              >
                Отмена
              </button>
            )}
          </div>
        </div>
      )}

      {/* Items Modal */}
      {showItemsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-4 border-yellow-400 p-6 rounded-3xl max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-black font-mono uppercase text-yellow-400 mb-4">
              Ваш Рюкзак Измерений:
            </h3>
            <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
              {items.map(item => (
                <button
                  key={item.id}
                  disabled={item.count <= 0}
                  onClick={() => handleUseItem(item)}
                  className="w-full flex items-center justify-between p-3 rounded-2xl border-2 border-slate-700 bg-slate-800 hover:border-emerald-400 hover:bg-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="text-left font-mono">
                    <div className="font-bold text-slate-200 text-sm">{item.name}</div>
                    <div className="text-xs text-slate-400">{item.description}</div>
                  </div>
                  <div className="font-mono text-xs font-bold text-yellow-400 bg-slate-900 px-2 py-1 rounded-lg">
                    x{item.count}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowItemsModal(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold py-2 rounded-xl"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'ROCK':
      return 'Камень';
    case 'PAPER':
      return 'Бумага';
    case 'SCISSORS':
      return 'Ножницы';
    default:
      return 'Что угодно';
  }
};
