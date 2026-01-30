import { ClientPlayer, WinnerInfo } from '../types';
import { Card } from './Card';

interface PlayerSeatProps {
  player: ClientPlayer;
  isDealer: boolean;
  isCurrentPlayer: boolean;
  isMe: boolean;
  winner?: WinnerInfo;
}

export function PlayerSeat({ player, isDealer, isCurrentPlayer, isMe, winner }: PlayerSeatProps) {
  const statusColors: Record<string, string> = {
    active: 'bg-green-600',
    folded: 'bg-gray-600 opacity-60',
    'all-in': 'bg-yellow-600',
    waiting: 'bg-gray-500',
    'sitting-out': 'bg-gray-700 opacity-50'
  };

  return (
    <div
      className={`relative flex flex-col items-center p-2 rounded-xl ${
        isCurrentPlayer ? 'ring-4 ring-yellow-400 animate-pulse-slow' : ''
      } ${isMe ? 'ring-2 ring-blue-400' : ''} ${
        player.status === 'folded' ? 'opacity-60' : ''
      }`}
    >
      {/* Dealer button */}
      {isDealer && (
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-bold text-gray-900 border-2 border-gray-400 shadow">
          D
        </div>
      )}

      {/* Cards */}
      <div className="flex gap-1 mb-2">
        {player.cards.length > 0 ? (
          player.cards.map((card, i) => (
            <Card key={i} card={card} small />
          ))
        ) : (
          <div className="w-10 h-14" />
        )}
      </div>

      {/* Player info */}
      <div
        className={`${statusColors[player.status]} px-3 py-1 rounded-lg text-white text-center min-w-[100px]`}
      >
        <div className="font-semibold text-sm truncate max-w-[100px]">
          {player.name}
          {player.isAI && ' (AI)'}
          {player.isDisconnected && ' (DC)'}
        </div>
        <div className="text-xs">${player.chips.toLocaleString()}</div>
      </div>

      {/* Current bet */}
      {player.bet > 0 && (
        <div className="mt-1 bg-orange-500 text-white px-2 py-0.5 rounded text-xs font-bold">
          Bet: ${player.bet}
        </div>
      )}

      {/* Status badges */}
      {player.status === 'all-in' && (
        <div className="mt-1 bg-red-600 text-white px-2 py-0.5 rounded text-xs font-bold animate-pulse">
          ALL IN
        </div>
      )}

      {/* Winner indicator */}
      {winner && (
        <div className="mt-1 bg-yellow-400 text-gray-900 px-2 py-1 rounded text-xs font-bold">
          Won ${winner.amount}!
          <br />
          {winner.handName}
        </div>
      )}
    </div>
  );
}
