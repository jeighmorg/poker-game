import { ClientGameState } from '../types';
import { Card } from './Card';
import { PlayerSeat } from './PlayerSeat';

interface PokerTableProps {
  gameState: ClientGameState;
}

// Position players around an oval table
// Positions for 6 players
const SEAT_POSITIONS = [
  { top: '75%', left: '50%', transform: 'translate(-50%, -50%)' },  // Bottom (seat 0 - "hero")
  { top: '60%', left: '10%', transform: 'translate(-50%, -50%)' },  // Bottom left
  { top: '25%', left: '10%', transform: 'translate(-50%, -50%)' },  // Top left
  { top: '10%', left: '50%', transform: 'translate(-50%, -50%)' },  // Top
  { top: '25%', left: '90%', transform: 'translate(-50%, -50%)' },  // Top right
  { top: '60%', left: '90%', transform: 'translate(-50%, -50%)' },  // Bottom right
];

export function PokerTable({ gameState }: PokerTableProps) {
  const { players, communityCards, pot, phase, dealerIndex, currentPlayerIndex, winners, myPlayerId } = gameState;

  // Reorder players so the current user is always at the bottom
  const myPlayer = players.find(p => p.id === myPlayerId);
  const mySeatIndex = myPlayer?.seatIndex ?? 0;

  return (
    <div className="relative w-full max-w-4xl aspect-[16/10] mx-auto">
      {/* Table felt */}
      <div className="absolute inset-4 bg-felt rounded-[50%] border-8 border-felt-dark shadow-2xl">
        {/* Inner border */}
        <div className="absolute inset-4 border-2 border-felt-dark rounded-[50%] opacity-30" />
      </div>

      {/* Community cards */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
        <div className="flex gap-2 mb-2">
          {communityCards.length > 0 ? (
            communityCards.map((card, i) => (
              <Card key={i} card={card} />
            ))
          ) : (
            phase !== 'waiting' && (
              <div className="text-white/50 text-sm">Waiting for cards...</div>
            )
          )}
        </div>

        {/* Pot */}
        {pot > 0 && (
          <div className="bg-black/50 text-white px-4 py-2 rounded-full font-bold">
            Pot: ${pot.toLocaleString()}
          </div>
        )}

        {/* Phase indicator */}
        <div className="mt-2 text-white/70 text-sm uppercase tracking-wide">
          {phase === 'waiting' ? 'Waiting for players...' : phase}
        </div>
      </div>

      {/* Player seats */}
      {SEAT_POSITIONS.map((position, seatIndex) => {
        const player = players.find(p => {
          // Adjust seat index relative to the viewer
          const adjustedSeat = (p.seatIndex - mySeatIndex + 6) % 6;
          return adjustedSeat === seatIndex;
        });

        if (!player) {
          return (
            <div
              key={seatIndex}
              className="absolute"
              style={position}
            >
              <div className="w-24 h-20 border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center text-white/30 text-xs">
                Empty
              </div>
            </div>
          );
        }

        const isDealer = players[dealerIndex]?.id === player.id;
        const isCurrentPlayer = players[currentPlayerIndex]?.id === player.id && phase !== 'waiting' && phase !== 'showdown';
        const isMe = player.id === myPlayerId;
        const winner = winners?.find(w => w.playerId === player.id);

        return (
          <div
            key={seatIndex}
            className="absolute"
            style={position}
          >
            <PlayerSeat
              player={player}
              isDealer={isDealer}
              isCurrentPlayer={isCurrentPlayer}
              isMe={isMe}
              winner={winner}
            />
          </div>
        );
      })}
    </div>
  );
}
