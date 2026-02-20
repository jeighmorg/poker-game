// Card types
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

// Player types
export type PlayerStatus = 'waiting' | 'active' | 'folded' | 'all-in' | 'sitting-out';

export interface Player {
  id: string;
  name: string;
  chips: number;
  cards: Card[];
  bet: number;
  status: PlayerStatus;
  isAI: boolean;
  isSpectator: boolean;
  seatIndex: number;
  disconnectedAt?: number;
  socketId?: string;
  showCards?: boolean; // Player chose to reveal cards at showdown
  hasActed?: boolean; // Has acted in the current betting round
}

// Game types
export type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

export interface GameState {
  id: string;
  players: Player[];
  communityCards: Card[];
  pot: number;
  sidePots: SidePot[];
  currentBet: number;
  minRaise: number;
  dealerIndex: number;
  currentPlayerIndex: number;
  phase: GamePhase;
  deck: Card[];
  smallBlind: number;
  bigBlind: number;
  lastAction?: { playerId: string; action: PlayerAction; amount?: number };
  winners?: WinnerInfo[];
}

export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface WinnerInfo {
  playerId: string;
  amount: number;
  handName: string;
}

// Hand evaluation
export type HandRank =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush'
  | 'royal-flush';

export interface HandResult {
  rank: HandRank;
  rankValue: number;
  cards: Card[];
  kickers: number[];
  description: string;
}

// Room types
export interface Room {
  id: string;
  name: string;
  game: GameState;
  spectators: string[];
  createdAt: number;
  settings: RoomSettings;
}

export interface RoomSettings {
  smallBlind: number;
  bigBlind: number;
  startingChips: number;
  maxPlayers: number;
  turnTimeLimit: number; // seconds
}

// Socket events
export interface ServerToClientEvents {
  gameState: (state: ClientGameState) => void;
  playerJoined: (player: { id: string; name: string; seatIndex: number }) => void;
  playerLeft: (playerId: string) => void;
  error: (message: string) => void;
  roomInfo: (info: { roomId: string; settings: RoomSettings }) => void;
  chatMessage: (message: { playerId: string; playerName: string; text: string }) => void;
  soundEffect: (sound: SoundEffect) => void;
}

export interface ClientToServerEvents {
  joinRoom: (data: { roomId: string; playerName: string; asSpectator?: boolean }) => void;
  leaveRoom: () => void;
  playerAction: (action: { type: PlayerAction; amount?: number }) => void;
  startGame: () => void;
  sendChat: (message: string) => void;
  takeSeat: (seatIndex: number) => void;
  standUp: () => void;
  addAI: () => void;
  revealCards: () => void;
  nextHand: () => void;
}

// Client game state (with hidden information filtered)
export interface ClientGameState {
  id: string;
  players: ClientPlayer[];
  communityCards: Card[];
  pot: number;
  sidePots: SidePot[];
  currentBet: number;
  minRaise: number;
  dealerIndex: number;
  currentPlayerIndex: number;
  phase: GamePhase;
  smallBlind: number;
  bigBlind: number;
  lastAction?: { playerId: string; action: PlayerAction; amount?: number };
  winners?: WinnerInfo[];
  myPlayerId?: string;
}

export interface ClientPlayer {
  id: string;
  name: string;
  chips: number;
  cards: (Card | null)[]; // null for hidden cards
  bet: number;
  status: PlayerStatus;
  isAI: boolean;
  isSpectator: boolean;
  seatIndex: number;
  isDisconnected: boolean;
  showCards?: boolean; // Player chose to reveal cards
}

export type SoundEffect = 'card-deal' | 'chip-bet' | 'chip-win' | 'fold' | 'check' | 'all-in' | 'your-turn';
