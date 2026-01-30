import { useState } from 'react';
import { ClientGameState, PlayerAction } from '../types';

interface ActionBarProps {
  gameState: ClientGameState;
  onAction: (action: PlayerAction, amount?: number) => void;
  onStartGame: () => void;
  onAddAI: () => void;
}

export function ActionBar({ gameState, onAction, onStartGame, onAddAI }: ActionBarProps) {
  const [raiseAmount, setRaiseAmount] = useState<number>(0);

  const { phase, players, currentPlayerIndex, currentBet, minRaise, bigBlind, myPlayerId } = gameState;
  const myPlayer = players.find(p => p.id === myPlayerId);
  const currentPlayer = players[currentPlayerIndex];

  const isMyTurn = myPlayer && currentPlayer?.id === myPlayerId && myPlayer.status === 'active';
  const toCall = myPlayer ? currentBet - myPlayer.bet : 0;

  // Calculate valid raise range
  const minRaiseTotal = currentBet + minRaise;
  const maxRaise = myPlayer ? myPlayer.chips + myPlayer.bet : 0;

  // Initialize raise slider when it's my turn
  if (isMyTurn && raiseAmount === 0) {
    setRaiseAmount(Math.min(minRaiseTotal, maxRaise));
  }

  if (phase === 'waiting') {
    const humanPlayers = players.filter(p => !p.isAI && !p.isSpectator);
    const totalPlayers = players.filter(p => !p.isSpectator);
    const canStart = totalPlayers.length >= 2;

    return (
      <div className="bg-gray-800 p-4 rounded-xl">
        <div className="text-center text-white mb-4">
          {totalPlayers.length} player{totalPlayers.length !== 1 ? 's' : ''} at table
          ({humanPlayers.length} human, {totalPlayers.length - humanPlayers.length} AI)
        </div>
        <div className="flex gap-4 justify-center flex-wrap">
          <button
            onClick={onStartGame}
            disabled={!canStart}
            className={`px-6 py-3 rounded-lg font-bold text-lg ${
              canStart
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Start Game
          </button>
          <button
            onClick={onAddAI}
            disabled={totalPlayers.length >= 6}
            className={`px-6 py-3 rounded-lg font-bold ${
              totalPlayers.length < 6
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Add AI Player
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'showdown') {
    return (
      <div className="bg-gray-800 p-4 rounded-xl text-center text-white">
        <div className="text-xl font-bold mb-2">Showdown!</div>
        <div className="text-gray-400">Next hand starting soon...</div>
      </div>
    );
  }

  if (!isMyTurn) {
    return (
      <div className="bg-gray-800 p-4 rounded-xl text-center text-white">
        <div className="text-gray-400">
          {currentPlayer ? `Waiting for ${currentPlayer.name}...` : 'Waiting...'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-xl">
      <div className="text-center text-yellow-400 font-bold mb-4">Your Turn!</div>

      {/* Main action buttons */}
      <div className="flex gap-3 justify-center flex-wrap mb-4">
        <button
          onClick={() => onAction('fold')}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
        >
          Fold
        </button>

        {toCall === 0 ? (
          <button
            onClick={() => onAction('check')}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold"
          >
            Check
          </button>
        ) : (
          <button
            onClick={() => onAction('call')}
            disabled={myPlayer!.chips < toCall}
            className={`px-6 py-3 rounded-lg font-bold ${
              myPlayer!.chips >= toCall
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Call ${Math.min(toCall, myPlayer!.chips)}
          </button>
        )}

        <button
          onClick={() => onAction('all-in')}
          className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-bold"
        >
          All In (${myPlayer!.chips})
        </button>
      </div>

      {/* Raise controls */}
      {myPlayer!.chips > toCall && (
        <div className="flex items-center gap-4 justify-center">
          <input
            type="range"
            min={minRaiseTotal}
            max={maxRaise}
            step={bigBlind}
            value={raiseAmount}
            onChange={(e) => setRaiseAmount(parseInt(e.target.value))}
            className="w-48"
          />
          <input
            type="number"
            min={minRaiseTotal}
            max={maxRaise}
            value={raiseAmount}
            onChange={(e) => setRaiseAmount(Math.max(minRaiseTotal, Math.min(maxRaise, parseInt(e.target.value) || minRaiseTotal)))}
            className="w-24 px-2 py-1 rounded bg-gray-700 text-white text-center"
          />
          <button
            onClick={() => {
              onAction('raise', raiseAmount);
              setRaiseAmount(0);
            }}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
          >
            Raise to ${raiseAmount}
          </button>
        </div>
      )}
    </div>
  );
}
