// Card types
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

// Player types
export type PlayerStatus = 'waiting' | 'active' | 'folded' | 'all-in' | 'sitting-out';
export type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

export interface ClientPlayer {
  id: string;
  name: string;
  chips: number;
  cards: (Card | null)[];
  bet: number;
  status: PlayerStatus;
  isAI: boolean;
  isSpectator: boolean;
  seatIndex: number;
  isDisconnected: boolean;
  showCards?: boolean;
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

export interface RoomSettings {
  smallBlind: number;
  bigBlind: number;
  startingChips: number;
  maxPlayers: number;
  turnTimeLimit: number;
}

export type SoundEffect = 'card-deal' | 'chip-bet' | 'chip-win' | 'fold' | 'check' | 'all-in' | 'your-turn';
