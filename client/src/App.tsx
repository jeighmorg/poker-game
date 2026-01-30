import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { useSound } from './hooks/useSound';
import { Lobby } from './components/Lobby';
import { PokerTable } from './components/PokerTable';
import { ActionBar } from './components/ActionBar';

function App() {
  const {
    connected,
    gameState,
    roomSettings,
    error,
    joinRoom,
    leaveRoom,
    startGame,
    playerAction,
    addAI,
    revealCards,
    nextHand,
    lastSound
  } = useSocket();

  const { playSound } = useSound();
  const [inRoom, setInRoom] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string>('');

  // Handle joining room
  const handleJoinRoom = (roomId: string, playerName: string, asSpectator: boolean) => {
    joinRoom(roomId, playerName, asSpectator);
    setCurrentRoomId(roomId);
    setInRoom(true);

    // Update URL with room code
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    window.history.pushState({}, '', url);
  };

  // Handle leaving room
  const handleLeaveRoom = () => {
    leaveRoom();
    setInRoom(false);
    setCurrentRoomId('');

    // Clear room from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.pushState({}, '', url);
  };

  // Play sound effects
  useEffect(() => {
    if (lastSound) {
      playSound(lastSound);
    }
  }, [lastSound, playSound]);

  // Show lobby if not in room
  if (!inRoom || !gameState) {
    return <Lobby onJoinRoom={handleJoinRoom} connected={connected} />;
  }

  const shareUrl = `${window.location.origin}?room=${currentRoomId}`;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLeaveRoom}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            ← Leave
          </button>
          <div className="text-white">
            <span className="text-gray-400">Room:</span>{' '}
            <span className="font-mono font-bold">{currentRoomId}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              navigator.clipboard.writeText(shareUrl);
              alert('Link copied to clipboard!');
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            Copy Invite Link
          </button>

          {roomSettings && (
            <div className="text-gray-400 text-sm">
              Blinds: ${roomSettings.smallBlind}/${roomSettings.bigBlind}
            </div>
          )}
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="bg-red-600 text-white text-center py-2">
          {error}
        </div>
      )}

      {/* Main game area */}
      <main className="flex-1 p-4 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <PokerTable gameState={gameState} />
        </div>

        {/* Action bar */}
        <div className="mt-4">
          <ActionBar
            gameState={gameState}
            onAction={playerAction}
            onStartGame={startGame}
            onAddAI={addAI}
            onRevealCards={revealCards}
            onNextHand={nextHand}
          />
        </div>
      </main>

      {/* Connection status */}
      <div className={`fixed bottom-4 left-4 px-3 py-1 rounded-full text-xs ${
        connected ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      }`}>
        {connected ? 'Connected' : 'Disconnected'}
      </div>
    </div>
  );
}

export default App;
