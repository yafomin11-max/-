import { MortyCard, MortyMove, MortyType } from '../types/game';

// Rock > Scissors > Paper > Rock
// ANY is neutral or matches target type
export const getTypeAdvantage = (attackerType: MortyType, defenderType: MortyType): { multiplier: number; label: string } => {
  if (attackerType === 'ANY' || defenderType === 'ANY') {
    return { multiplier: 1.0, label: 'Обычный урон' };
  }

  if (
    (attackerType === 'ROCK' && defenderType === 'SCISSORS') ||
    (attackerType === 'SCISSORS' && defenderType === 'PAPER') ||
    (attackerType === 'PAPER' && defenderType === 'ROCK')
  ) {
    return { multiplier: 1.5, label: 'СУПЕР-ЭФФЕКТИВНО!' };
  }

  if (
    (attackerType === 'SCISSORS' && defenderType === 'ROCK') ||
    (attackerType === 'PAPER' && defenderType === 'SCISSORS') ||
    (attackerType === 'ROCK' && defenderType === 'PAPER')
  ) {
    return { multiplier: 0.7, label: 'Недостаточно эффективно...' };
  }

  return { multiplier: 1.0, label: 'Обычный урон' };
};

export interface ActiveMorty {
  card: MortyCard;
  currentHp: number;
}

export interface BattleLogEntry {
  id: string;
  text: string;
  type: 'player' | 'opponent' | 'system' | 'effective' | 'item';
  timestamp: string;
}

export const calculateDamage = (
  _attacker: MortyCard,
  move: MortyMove,
  defender: MortyCard
): { damage: number; multiplier: number; isCrit: boolean; advantageLabel: string } => {
  const advantage = getTypeAdvantage(move.type, defender.type);
  const isCrit = Math.random() < 0.15; // 15% crit chance
  const critMultiplier = isCrit ? 1.5 : 1.0;

  // Small random variance (0.9 to 1.1)
  const variance = 0.9 + Math.random() * 0.2;

  const rawDamage = move.baseDamage * advantage.multiplier * critMultiplier * variance;
  const finalDamage = Math.max(5, Math.round(rawDamage));

  return {
    damage: finalDamage,
    multiplier: advantage.multiplier,
    isCrit,
    advantageLabel: advantage.label
  };
};

export const selectAiMove = (aiMorty: ActiveMorty, playerMorty: ActiveMorty): MortyMove => {
  const moves = aiMorty.card.moves;

  // Prefer move with super effectiveness
  for (const move of moves) {
    const adv = getTypeAdvantage(move.type, playerMorty.card.type);
    if (adv.multiplier > 1.0) {
      return move;
    }
  }

  // Otherwise pick highest damage or random
  return moves[Math.floor(Math.random() * moves.length)];
};
