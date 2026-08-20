import React from 'react';
import { MortyType } from '../types/game';

interface IconProps {
  className?: string;
  size?: number;
}

export const RockIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    className={className}
  >
    <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.2L18 8v8l-6 3.75L6 16V8l6-3.8zM8.5 9.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm7 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-3.5 5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
  </svg>
);

export const PaperIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="16" y2="17" />
    <line x1="10" y1="9" x2="11" y2="9" />
  </svg>
);

export const ScissorsIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" />
    <line x1="14.47" y1="14.48" x2="20" y2="20" />
    <line x1="8.12" y1="8.12" x2="12" y2="12" />
  </svg>
);

export const AnyIcon: React.FC<IconProps> = ({ className = "w-5 h-5" }) => (
  <div className={`flex items-center justify-center space-x-0.5 ${className}`}>
    <div className="w-1.5 h-1.5 rounded-full bg-amber-600" />
    <div className="w-1.5 h-1.5 rounded-full bg-cyan-600" />
    <div className="w-1.5 h-1.5 rounded-full bg-rose-600" />
  </div>
);

export const TypeBadgeIcon: React.FC<{ type: MortyType; className?: string }> = ({ type, className = "w-5 h-5" }) => {
  switch (type) {
    case 'ROCK':
      return <RockIcon className={className} />;
    case 'PAPER':
      return <PaperIcon className={className} />;
    case 'SCISSORS':
      return <ScissorsIcon className={className} />;
    case 'ANY':
    default:
      return <AnyIcon className={className} />;
  }
};

export const getTypeLabelRu = (type: MortyType): string => {
  switch (type) {
    case 'ROCK':
      return 'КАМЕНЬ';
    case 'PAPER':
      return 'БУМАГА';
    case 'SCISSORS':
      return 'НОЖНИЦЫ';
    case 'ANY':
      return 'ЧТО УГОДНО';
  }
};
