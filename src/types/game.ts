export type MortyType = 'ROCK' | 'PAPER' | 'SCISSORS' | 'ANY';

export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export interface MortyMove {
  id: string;
  name: string;
  type: MortyType;
  baseDamage: number;
  accuracy: number; // 0 to 1
  description: string;
  maxPp?: number;
}

export interface MortyCard {
  id: string;
  number: number;
  name: string;
  type: MortyType;
  maxHp: number;
  moves: MortyMove[];
  weakness: MortyType[]; // Mortys can be weak to specific types
  description: string;
  flavorQuote: string;
  image: string;
  rarity: Rarity;
  dimension?: string;
}

export interface BattleItem {
  id: string;
  name: string;
  description: string;
  type: 'HEAL' | 'BUFF' | 'MEESEEKS' | 'CAPTURE';
  value: number; // heal amount or catch multiplier
  count: number;
  imageIcon: string;
}

export interface PlayerStats {
  tickets: number;
  schmeckles: number;
  dimensionBadge: number;
  wins: number;
  losses: number;
}
