import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientGameState, RoomSettings, PlayerAction, SoundEffect } from '../types';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

interface UseSocketReturn {
  connected: boolean;
  gameState: ClientGameState | null;
  roomSettings: RoomSettings | null;
  error: string | null;
  joinRoom: (roomId: string, playerName: string, asSpectator?: boolean) => void;
  leaveRoom: () => void;
  startGame: () => void;
  playerAction: (action: PlayerAction, amount?: number) => void;
  addAI: () => void;
  sendChat: (message: string) => void;
  chatMessages: ChatMessage[];
  lastSound: SoundEffect | null;
}

interface ChatMessage {
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [roomSettings, setRoomSettings] = useState<RoomSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [lastSound, setLastSound] = useState<SoundEffect | null>(null);

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('Failed to connect to server');
    });

    socket.on('gameState', (state: ClientGameState) => {
      setGameState(state);
    });

    socket.on('roomInfo', ({ settings }: { roomId: string; settings: RoomSettings }) => {
      setRoomSettings(settings);
    });

    socket.on('error', (message: string) => {
      setError(message);
      setTimeout(() => setError(null), 3000);
    });

    socket.on('chatMessage', (message: { playerId: string; playerName: string; text: string }) => {
      setChatMessages(prev => [...prev.slice(-50), { ...message, timestamp: Date.now() }]);
    });

    socket.on('soundEffect', (sound: SoundEffect) => {
      setLastSound(sound);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = useCallback((roomId: string, playerName: string, asSpectator = false) => {
    socketRef.current?.emit('joinRoom', { roomId, playerName, asSpectator });
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('leaveRoom');
    setGameState(null);
    setRoomSettings(null);
    setChatMessages([]);
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit('startGame');
  }, []);

  const playerAction = useCallback((action: PlayerAction, amount?: number) => {
    socketRef.current?.emit('playerAction', { type: action, amount });
  }, []);

  const addAI = useCallback(() => {
    socketRef.current?.emit('addAI');
  }, []);

  const sendChat = useCallback((message: string) => {
    socketRef.current?.emit('sendChat', message);
  }, []);

  return {
    connected,
    gameState,
    roomSettings,
    error,
    joinRoom,
    leaveRoom,
    startGame,
    playerAction,
    addAI,
    sendChat,
    chatMessages,
    lastSound
  };
}
