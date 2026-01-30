import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  Room, RoomSettings, ServerToClientEvents, ClientToServerEvents,
  Player, SoundEffect, GamePhase
} from './types';
import {
  createGame, addPlayer, removePlayer, addAIPlayer,
  canStartGame, startNewHand, getCurrentPlayer, processAction,
  getAIAction, toClientGameState, getPlayersInHand
} from './game';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

// In-memory room storage
const rooms = new Map<string, Room>();

// Player to room mapping
const playerRooms = new Map<string, string>();

// Default room settings
const defaultSettings: RoomSettings = {
  smallBlind: 10,
  bigBlind: 20,
  startingChips: 1000,
  maxPlayers: 6,
  turnTimeLimit: 30
};

// Disconnect timeout tracking
const disconnectTimeouts = new Map<string, NodeJS.Timeout>();

// Create a new room
app.post('/api/rooms', (req, res) => {
  const roomId = uuidv4().substring(0, 8);
  const settings = { ...defaultSettings, ...req.body.settings };

  const room: Room = {
    id: roomId,
    name: req.body.name || `Room ${roomId}`,
    game: createGame(settings),
    spectators: [],
    createdAt: Date.now(),
    settings
  };

  rooms.set(roomId, room);
  res.json({ roomId, settings });
});

// Get room info
app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.json({
    id: room.id,
    name: room.name,
    playerCount: room.game.players.filter(p => !p.isSpectator).length,
    spectatorCount: room.spectators.length,
    settings: room.settings,
    phase: room.game.phase
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  let currentPlayerId: string | undefined;
  let currentRoomId: string | undefined;

  socket.on('joinRoom', ({ roomId, playerName, asSpectator }) => {
    let room = rooms.get(roomId);

    // Auto-create room if it doesn't exist
    if (!room) {
      room = {
        id: roomId,
        name: `Room ${roomId}`,
        game: createGame(defaultSettings),
        spectators: [],
        createdAt: Date.now(),
        settings: defaultSettings
      };
      rooms.set(roomId, room);
    }

    // Leave previous room if any
    if (currentRoomId && currentRoomId !== roomId) {
      leaveCurrentRoom();
    }

    currentRoomId = roomId;
    socket.join(roomId);

    if (asSpectator) {
      room.spectators.push(socket.id);
      socket.emit('roomInfo', { roomId, settings: room.settings });
      socket.emit('gameState', toClientGameState(room.game));
      return;
    }

    // Check if player is reconnecting
    const existingPlayer = room.game.players.find(p =>
      p.name === playerName && p.disconnectedAt !== undefined
    );

    if (existingPlayer) {
      // Reconnect
      existingPlayer.socketId = socket.id;
      existingPlayer.disconnectedAt = undefined;
      currentPlayerId = existingPlayer.id;

      // Clear disconnect timeout
      const timeoutKey = `${roomId}-${existingPlayer.id}`;
      const timeout = disconnectTimeouts.get(timeoutKey);
      if (timeout) {
        clearTimeout(timeout);
        disconnectTimeouts.delete(timeoutKey);
      }

      console.log(`Player ${playerName} reconnected to room ${roomId}`);
    } else {
      // Find empty seat
      const occupiedSeats = new Set(room.game.players.map(p => p.seatIndex));
      let emptySeat = -1;
      for (let i = 0; i < room.settings.maxPlayers; i++) {
        if (!occupiedSeats.has(i)) {
          emptySeat = i;
          break;
        }
      }

      if (emptySeat === -1) {
        // No seats available, join as spectator
        room.spectators.push(socket.id);
        socket.emit('error', 'Table is full. Joined as spectator.');
        socket.emit('roomInfo', { roomId, settings: room.settings });
        socket.emit('gameState', toClientGameState(room.game));
        return;
      }

      // Add new player
      const player = addPlayer(
        room.game,
        playerName,
        room.settings.startingChips,
        emptySeat,
        socket.id
      );
      currentPlayerId = player.id;

      io.to(roomId).emit('playerJoined', {
        id: player.id,
        name: player.name,
        seatIndex: player.seatIndex
      });

      console.log(`Player ${playerName} joined room ${roomId} at seat ${emptySeat}`);
    }

    playerRooms.set(socket.id, roomId);
    socket.emit('roomInfo', { roomId, settings: room.settings });
    broadcastGameState(room);
  });

  socket.on('leaveRoom', () => {
    leaveCurrentRoom();
  });

  socket.on('startGame', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    if (canStartGame(room.game)) {
      startNewHand(room.game);
      broadcastGameState(room);
      emitSound(currentRoomId, 'card-deal');

      // Start AI turn if needed
      scheduleAITurn(room);
    } else {
      socket.emit('error', 'Cannot start game. Need at least 2 players.');
    }
  });

  socket.on('playerAction', ({ type, amount }) => {
    if (!currentRoomId || !currentPlayerId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const currentPlayer = getCurrentPlayer(room.game);
    if (!currentPlayer || currentPlayer.id !== currentPlayerId) {
      socket.emit('error', 'Not your turn');
      return;
    }

    const success = processAction(room.game, currentPlayerId, type, amount);
    if (!success) {
      socket.emit('error', 'Invalid action');
      return;
    }

    // Emit sound effects
    switch (type) {
      case 'fold': emitSound(currentRoomId, 'fold'); break;
      case 'check': emitSound(currentRoomId, 'check'); break;
      case 'call':
      case 'raise': emitSound(currentRoomId, 'chip-bet'); break;
      case 'all-in': emitSound(currentRoomId, 'all-in'); break;
    }

    broadcastGameState(room);

    // Check for game end
    if (room.game.phase === 'showdown') {
      emitSound(currentRoomId, 'chip-win');
      // Auto-start next hand after delay
      setTimeout(() => {
        if (canStartGame(room.game)) {
          startNewHand(room.game);
          broadcastGameState(room);
          emitSound(currentRoomId!, 'card-deal');
          scheduleAITurn(room);
        }
      }, 5000);
    } else {
      // Notify current player it's their turn
      notifyCurrentPlayer(room);
      scheduleAITurn(room);
    }
  });

  socket.on('addAI', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    if (room.game.phase !== 'waiting') {
      socket.emit('error', 'Can only add AI between hands');
      return;
    }

    const ai = addAIPlayer(room.game, room.settings);
    if (ai) {
      io.to(currentRoomId).emit('playerJoined', {
        id: ai.id,
        name: ai.name,
        seatIndex: ai.seatIndex
      });
      broadcastGameState(room);
    } else {
      socket.emit('error', 'Cannot add more AI players');
    }
  });

  socket.on('sendChat', (message) => {
    if (!currentRoomId || !currentPlayerId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const player = room.game.players.find(p => p.id === currentPlayerId);
    if (!player) return;

    io.to(currentRoomId).emit('chatMessage', {
      playerId: currentPlayerId,
      playerName: player.name,
      text: message
    });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    handleDisconnect();
  });

  function leaveCurrentRoom() {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    // Remove from spectators
    room.spectators = room.spectators.filter(id => id !== socket.id);

    // Handle player leaving
    if (currentPlayerId) {
      const player = room.game.players.find(p => p.id === currentPlayerId);
      if (player) {
        if (room.game.phase === 'waiting') {
          // Remove player if game hasn't started
          removePlayer(room.game, currentPlayerId);
          io.to(currentRoomId).emit('playerLeft', currentPlayerId);
        } else {
          // Mark as disconnected during game
          player.disconnectedAt = Date.now();
          player.socketId = undefined;

          // Set timeout to auto-fold
          const timeoutKey = `${currentRoomId}-${currentPlayerId}`;
          const timeout = setTimeout(() => {
            if (player.status === 'active') {
              const currentPlayerNow = getCurrentPlayer(room.game);
              if (currentPlayerNow?.id === player.id) {
                processAction(room.game, player.id, 'fold');
                broadcastGameState(room);
                scheduleAITurn(room);
              }
            }
            disconnectTimeouts.delete(timeoutKey);
          }, room.settings.turnTimeLimit * 1000);

          disconnectTimeouts.set(timeoutKey, timeout);
        }
      }
    }

    socket.leave(currentRoomId);
    playerRooms.delete(socket.id);
    broadcastGameState(room);

    // Clean up empty rooms
    if (room.game.players.length === 0 && room.spectators.length === 0) {
      rooms.delete(currentRoomId);
      console.log(`Room ${currentRoomId} deleted (empty)`);
    }

    currentRoomId = undefined;
    currentPlayerId = undefined;
  }

  function handleDisconnect() {
    if (currentRoomId && currentPlayerId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        const player = room.game.players.find(p => p.id === currentPlayerId);
        if (player) {
          player.disconnectedAt = Date.now();
          player.socketId = undefined;

          // Set timeout to auto-fold if it's their turn
          const timeoutKey = `${currentRoomId}-${currentPlayerId}`;
          const timeout = setTimeout(() => {
            const currentPlayerNow = getCurrentPlayer(room.game);
            if (currentPlayerNow?.id === player.id && player.status === 'active') {
              processAction(room.game, player.id, 'fold');
              broadcastGameState(room);
              scheduleAITurn(room);
            }
            disconnectTimeouts.delete(timeoutKey);
          }, room.settings.turnTimeLimit * 1000);

          disconnectTimeouts.set(timeoutKey, timeout);
          broadcastGameState(room);
        }
      }
    }
    playerRooms.delete(socket.id);
  }
});

function broadcastGameState(room: Room) {
  // Send personalized game state to each player
  for (const player of room.game.players) {
    if (player.socketId) {
      const socket = io.sockets.sockets.get(player.socketId);
      if (socket) {
        socket.emit('gameState', toClientGameState(room.game, player.id));
      }
    }
  }

  // Send spectator view to spectators
  for (const spectatorId of room.spectators) {
    const socket = io.sockets.sockets.get(spectatorId);
    if (socket) {
      socket.emit('gameState', toClientGameState(room.game));
    }
  }
}

function notifyCurrentPlayer(room: Room) {
  const currentPlayer = getCurrentPlayer(room.game);
  if (currentPlayer?.socketId) {
    const socket = io.sockets.sockets.get(currentPlayer.socketId);
    if (socket) {
      socket.emit('soundEffect', 'your-turn');
    }
  }
}

function emitSound(roomId: string, sound: SoundEffect) {
  io.to(roomId).emit('soundEffect', sound);
}

function scheduleAITurn(room: Room) {
  const currentPlayer = getCurrentPlayer(room.game);
  if (!currentPlayer || !currentPlayer.isAI) return;

  // AI takes action after a short delay (to feel more natural)
  setTimeout(() => {
    if (room.game.phase === 'waiting' || room.game.phase === 'showdown') return;

    const stillCurrentPlayer = getCurrentPlayer(room.game);
    if (!stillCurrentPlayer || stillCurrentPlayer.id !== currentPlayer.id) return;

    const { action, amount } = getAIAction(room.game, currentPlayer);
    processAction(room.game, currentPlayer.id, action, amount);

    switch (action) {
      case 'fold': emitSound(room.id, 'fold'); break;
      case 'check': emitSound(room.id, 'check'); break;
      case 'call':
      case 'raise': emitSound(room.id, 'chip-bet'); break;
      case 'all-in': emitSound(room.id, 'all-in'); break;
    }

    broadcastGameState(room);

    // Check phase after processAction (it may have changed)
    // Use type assertion since processAction can mutate phase to 'showdown'
    const currentPhase = room.game.phase as GamePhase;
    if (currentPhase === 'showdown') {
      emitSound(room.id, 'chip-win');
      setTimeout(() => {
        if (canStartGame(room.game)) {
          startNewHand(room.game);
          broadcastGameState(room);
          emitSound(room.id, 'card-deal');
          scheduleAITurn(room);
        }
      }, 5000);
    } else {
      notifyCurrentPlayer(room);
      scheduleAITurn(room);
    }
  }, 1000 + Math.random() * 2000);
}

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Poker server running on port ${PORT}`);
});
