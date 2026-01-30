import { Card as CardType } from '../types';

interface CardProps {
  card: CardType | null;
  small?: boolean;
}

const suitSymbols: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠'
};

const suitColors: Record<string, string> = {
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-gray-900',
  spades: 'text-gray-900'
};

export function Card({ card, small = false }: CardProps) {
  if (!card) {
    // Face down card
    return (
      <div
        className={`${small ? 'w-10 h-14' : 'w-14 h-20'} rounded-lg bg-gradient-to-br from-blue-700 to-blue-900 border-2 border-blue-500 shadow-lg flex items-center justify-center`}
      >
        <div className="w-3/4 h-3/4 border border-blue-400 rounded opacity-50" />
      </div>
    );
  }

  return (
    <div
      className={`${small ? 'w-10 h-14 text-sm' : 'w-14 h-20 text-lg'} rounded-lg bg-white border border-gray-300 shadow-lg flex flex-col items-center justify-center ${suitColors[card.suit]}`}
    >
      <span className="font-bold">{card.rank}</span>
      <span className={small ? 'text-base' : 'text-xl'}>{suitSymbols[card.suit]}</span>
    </div>
  );
}
