import { useState, useEffect } from 'react';

interface LobbyProps {
  onJoinRoom: (roomId: string, playerName: string, asSpectator: boolean) => void;
  connected: boolean;
}

export function Lobby({ onJoinRoom, connected }: LobbyProps) {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [asSpectator, setAsSpectator] = useState(false);

  // Check for room ID in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoomId = params.get('room');
    if (urlRoomId) {
      setRoomId(urlRoomId);
    }

    // Load saved player name
    const savedName = localStorage.getItem('pokerPlayerName');
    if (savedName) {
      setPlayerName(savedName);
    }
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim() || !playerName.trim()) return;

    // Save player name
    localStorage.setItem('pokerPlayerName', playerName);

    // Generate room ID if not provided
    const finalRoomId = roomId.trim() || Math.random().toString(36).substring(2, 8);

    onJoinRoom(finalRoomId, playerName.trim(), asSpectator);
  };

  const generateRoomId = () => {
    setRoomId(Math.random().toString(36).substring(2, 8));
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">♠♥♣♦</div>
          <h1 className="text-3xl font-bold text-white">Texas Hold'em</h1>
          <p className="text-gray-400 mt-2">Play poker with friends</p>
        </div>

        {!connected && (
          <div className="bg-red-600/20 border border-red-600 text-red-400 p-3 rounded-lg mb-4 text-center">
            Connecting to server...
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm mb-2">Your Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              maxLength={20}
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-2">Room Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toLowerCase())}
                placeholder="Enter room code"
                className="flex-1 px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                maxLength={10}
              />
              <button
                type="button"
                onClick={generateRoomId}
                className="px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
                title="Generate random room code"
              >
                🎲
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-1">
              Leave empty to create a new room
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="spectator"
              checked={asSpectator}
              onChange={(e) => setAsSpectator(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="spectator" className="text-gray-300 text-sm">
              Join as spectator (watch only)
            </label>
          </div>

          <button
            type="submit"
            disabled={!connected || !playerName.trim()}
            className={`w-full py-4 rounded-lg font-bold text-lg transition ${
              connected && playerName.trim()
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {asSpectator ? 'Watch Game' : 'Join Game'}
          </button>
        </form>

        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Share the room code with friends to play together!</p>
        </div>
      </div>
    </div>
  );
}
