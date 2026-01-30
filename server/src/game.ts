import { v4 as uuidv4 } from 'uuid';
import {
  GameState, Player, PlayerAction, GamePhase, Card,
  WinnerInfo, SidePot, RoomSettings, ClientGameState, ClientPlayer
} from './types';
import { createDeck, shuffleDeck, evaluateHand, compareHands } from './cards';

const AI_NAMES = ['Bot Alice', 'Bot Bob', 'Bot Charlie', 'Bot Diana', 'Bot Eve', 'Bot Frank'];

export function createGame(settings: RoomSettings): GameState {
  return {
    id: uuidv4(),
    players: [],
    communityCards: [],
    pot: 0,
    sidePots: [],
    currentBet: 0,
    minRaise: settings.bigBlind,
    dealerIndex: 0,
    currentPlayerIndex: 0,
    phase: 'waiting',
    deck: [],
    smallBlind: settings.smallBlind,
    bigBlind: settings.bigBlind
  };
}

export function addPlayer(
  game: GameState,
  name: string,
  startingChips: number,
  seatIndex: number,
  socketId?: string,
  isAI = false
): Player {
  const player: Player = {
    id: uuidv4(),
    name,
    chips: startingChips,
    cards: [],
    bet: 0,
    status: 'waiting',
    isAI,
    isSpectator: false,
    seatIndex,
    socketId
  };
  game.players.push(player);
  game.players.sort((a, b) => a.seatIndex - b.seatIndex);
  return player;
}

export function removePlayer(game: GameState, playerId: string): void {
  const index = game.players.findIndex(p => p.id === playerId);
  if (index !== -1) {
    game.players.splice(index, 1);
  }
}

export function addAIPlayer(game: GameState, settings: RoomSettings): Player | null {
  const usedNames = new Set(game.players.map(p => p.name));
  const availableName = AI_NAMES.find(n => !usedNames.has(n));
  if (!availableName) return null;

  // Find empty seat
  const occupiedSeats = new Set(game.players.map(p => p.seatIndex));
  let emptySeat = -1;
  for (let i = 0; i < settings.maxPlayers; i++) {
    if (!occupiedSeats.has(i)) {
      emptySeat = i;
      break;
    }
  }
  if (emptySeat === -1) return null;

  return addPlayer(game, availableName, settings.startingChips, emptySeat, undefined, true);
}

export function getActivePlayers(game: GameState): Player[] {
  return game.players.filter(p =>
    !p.isSpectator && (p.status === 'active' || p.status === 'all-in')
  );
}

export function getPlayersInHand(game: GameState): Player[] {
  return game.players.filter(p =>
    !p.isSpectator && p.status !== 'folded' && p.status !== 'waiting' && p.status !== 'sitting-out'
  );
}

export function canStartGame(game: GameState): boolean {
  const playersReady = game.players.filter(p => !p.isSpectator && p.chips > 0);
  return playersReady.length >= 2 && game.phase === 'waiting';
}

export function startNewHand(game: GameState): void {
  // Reset for new hand
  game.deck = shuffleDeck(createDeck());
  game.communityCards = [];
  game.pot = 0;
  game.sidePots = [];
  game.currentBet = 0;
  game.minRaise = game.bigBlind;
  game.winners = undefined;
  game.lastAction = undefined;

  // Reset players
  for (const player of game.players) {
    player.cards = [];
    player.bet = 0;
    if (!player.isSpectator && player.chips > 0) {
      player.status = 'active';
    } else if (player.chips <= 0) {
      player.status = 'sitting-out';
    }
  }

  // Move dealer button
  const activePlayers = game.players.filter(p => p.status === 'active');
  if (activePlayers.length < 2) {
    game.phase = 'waiting';
    return;
  }

  // Find next dealer among active players
  let dealerFound = false;
  let searchIndex = (game.dealerIndex + 1) % game.players.length;
  for (let i = 0; i < game.players.length; i++) {
    const player = game.players[searchIndex];
    if (player.status === 'active') {
      game.dealerIndex = searchIndex;
      dealerFound = true;
      break;
    }
    searchIndex = (searchIndex + 1) % game.players.length;
  }

  if (!dealerFound) {
    game.phase = 'waiting';
    return;
  }

  // Post blinds
  const smallBlindIndex = getNextActivePlayerIndex(game, game.dealerIndex);
  const bigBlindIndex = getNextActivePlayerIndex(game, smallBlindIndex);

  const sbPlayer = game.players[smallBlindIndex];
  const bbPlayer = game.players[bigBlindIndex];

  postBlind(game, sbPlayer, game.smallBlind);
  postBlind(game, bbPlayer, game.bigBlind);

  game.currentBet = game.bigBlind;

  // Deal hole cards
  for (const player of game.players) {
    if (player.status === 'active' || player.status === 'all-in') {
      player.cards = [game.deck.pop()!, game.deck.pop()!];
    }
  }

  // Set first to act (after big blind)
  game.currentPlayerIndex = getNextActivePlayerIndex(game, bigBlindIndex);
  game.phase = 'preflop';
}

function postBlind(game: GameState, player: Player, amount: number): void {
  const actualAmount = Math.min(amount, player.chips);
  player.chips -= actualAmount;
  player.bet = actualAmount;
  game.pot += actualAmount;

  if (player.chips === 0) {
    player.status = 'all-in';
  }
}

function getNextActivePlayerIndex(game: GameState, fromIndex: number): number {
  let index = (fromIndex + 1) % game.players.length;
  for (let i = 0; i < game.players.length; i++) {
    const player = game.players[index];
    if (player.status === 'active') {
      return index;
    }
    index = (index + 1) % game.players.length;
  }
  return -1;
}

export function getCurrentPlayer(game: GameState): Player | null {
  if (game.phase === 'waiting' || game.phase === 'showdown') return null;
  return game.players[game.currentPlayerIndex] || null;
}

export function getValidActions(game: GameState, player: Player): PlayerAction[] {
  if (player.status !== 'active') return [];

  const actions: PlayerAction[] = ['fold'];
  const toCall = game.currentBet - player.bet;

  if (toCall === 0) {
    actions.push('check');
  } else if (player.chips >= toCall) {
    actions.push('call');
  }

  if (player.chips > toCall) {
    actions.push('raise');
  }

  actions.push('all-in');

  return actions;
}

export function processAction(
  game: GameState,
  playerId: string,
  action: PlayerAction,
  amount?: number
): boolean {
  const player = game.players.find(p => p.id === playerId);
  if (!player) return false;

  const currentPlayer = getCurrentPlayer(game);
  if (!currentPlayer || currentPlayer.id !== playerId) return false;

  const validActions = getValidActions(game, player);
  if (!validActions.includes(action)) return false;

  const toCall = game.currentBet - player.bet;

  switch (action) {
    case 'fold':
      player.status = 'folded';
      break;

    case 'check':
      if (toCall !== 0) return false;
      break;

    case 'call':
      const callAmount = Math.min(toCall, player.chips);
      player.chips -= callAmount;
      player.bet += callAmount;
      game.pot += callAmount;
      if (player.chips === 0) player.status = 'all-in';
      break;

    case 'raise':
      if (!amount || amount < game.minRaise + game.currentBet) {
        amount = game.minRaise + game.currentBet;
      }
      const raiseTotal = amount - player.bet;
      if (raiseTotal > player.chips) return false;

      const raiseBy = amount - game.currentBet;
      game.minRaise = Math.max(game.minRaise, raiseBy);
      game.currentBet = amount;

      player.chips -= raiseTotal;
      game.pot += raiseTotal;
      player.bet = amount;

      if (player.chips === 0) player.status = 'all-in';
      break;

    case 'all-in':
      const allInAmount = player.chips;
      game.pot += allInAmount;
      player.bet += allInAmount;
      player.chips = 0;
      player.status = 'all-in';

      if (player.bet > game.currentBet) {
        const raiseAmount = player.bet - game.currentBet;
        game.minRaise = Math.max(game.minRaise, raiseAmount);
        game.currentBet = player.bet;
      }
      break;
  }

  game.lastAction = { playerId, action, amount };

  // Move to next player or next phase
  advanceGame(game);

  return true;
}

function advanceGame(game: GameState): void {
  const playersInHand = getPlayersInHand(game);

  // Check if only one player left
  if (playersInHand.length === 1) {
    // Winner takes pot
    const winner = playersInHand[0];
    winner.chips += game.pot;
    game.winners = [{ playerId: winner.id, amount: game.pot, handName: 'Last player standing' }];
    game.phase = 'showdown';
    return;
  }

  // Check if betting round is complete
  const activePlayers = playersInHand.filter(p => p.status === 'active');
  const allMatched = activePlayers.every(p => p.bet === game.currentBet || p.status === 'all-in');
  const allActed = activePlayers.length === 0 ||
    (activePlayers.length > 0 && allMatched && hasEveryoneActed(game));

  if (allActed || activePlayers.length <= 1) {
    // Move to next phase
    moveToNextPhase(game);
  } else {
    // Move to next active player
    game.currentPlayerIndex = getNextActivePlayerIndex(game, game.currentPlayerIndex);
  }
}

function hasEveryoneActed(game: GameState): boolean {
  // Simple check: if we've gone around and everyone has matched or is all-in
  const playersInHand = getPlayersInHand(game);
  return playersInHand.every(p =>
    p.bet === game.currentBet || p.status === 'all-in' || p.status === 'folded'
  );
}

function moveToNextPhase(game: GameState): void {
  // Reset bets for new round
  for (const player of game.players) {
    player.bet = 0;
  }
  game.currentBet = 0;
  game.minRaise = game.bigBlind;

  const playersInHand = getPlayersInHand(game);

  // Check if we should skip to showdown (all players all-in or only one active)
  const activePlayers = playersInHand.filter(p => p.status === 'active');
  const skipToShowdown = activePlayers.length <= 1;

  switch (game.phase) {
    case 'preflop':
      // Deal flop
      game.deck.pop(); // Burn
      game.communityCards.push(game.deck.pop()!, game.deck.pop()!, game.deck.pop()!);
      game.phase = 'flop';
      break;

    case 'flop':
      // Deal turn
      game.deck.pop(); // Burn
      game.communityCards.push(game.deck.pop()!);
      game.phase = 'turn';
      break;

    case 'turn':
      // Deal river
      game.deck.pop(); // Burn
      game.communityCards.push(game.deck.pop()!);
      game.phase = 'river';
      break;

    case 'river':
      // Showdown
      determineWinners(game);
      game.phase = 'showdown';
      return;
  }

  if (skipToShowdown && game.phase !== 'showdown') {
    // Run out remaining cards
    while (game.communityCards.length < 5) {
      game.deck.pop(); // Burn
      game.communityCards.push(game.deck.pop()!);
    }
    determineWinners(game);
    game.phase = 'showdown';
    return;
  }

  // Set first to act (first active player after dealer)
  game.currentPlayerIndex = getNextActivePlayerIndex(game, game.dealerIndex);
}

function determineWinners(game: GameState): void {
  const playersInHand = getPlayersInHand(game);

  if (playersInHand.length === 1) {
    const winner = playersInHand[0];
    winner.chips += game.pot;
    game.winners = [{ playerId: winner.id, amount: game.pot, handName: 'Last player standing' }];
    return;
  }

  // Evaluate all hands
  const playerHands = playersInHand.map(player => ({
    player,
    hand: evaluateHand(player.cards, game.communityCards)
  }));

  // Sort by hand strength (best first)
  playerHands.sort((a, b) => compareHands(b.hand, a.hand));

  // Find all winners (could be ties)
  const bestHand = playerHands[0].hand;
  const winners = playerHands.filter(ph => compareHands(ph.hand, bestHand) === 0);

  // Split pot among winners
  const winAmount = Math.floor(game.pot / winners.length);
  const remainder = game.pot % winners.length;

  game.winners = winners.map((w, index) => ({
    playerId: w.player.id,
    amount: winAmount + (index === 0 ? remainder : 0),
    handName: w.hand.description
  }));

  // Award chips
  for (const winner of game.winners) {
    const player = game.players.find(p => p.id === winner.playerId);
    if (player) {
      player.chips += winner.amount;
    }
  }
}

// AI decision making (simple strategy)
export function getAIAction(game: GameState, player: Player): { action: PlayerAction; amount?: number } {
  const validActions = getValidActions(game, player);
  const toCall = game.currentBet - player.bet;
  const potOdds = toCall / (game.pot + toCall);

  // Evaluate hand strength
  const hand = evaluateHand(player.cards, game.communityCards);
  const handStrength = hand.rankValue / 10; // Normalize to 0-1

  // Random factor for unpredictability
  const randomFactor = Math.random() * 0.3;

  // Decision making
  if (handStrength + randomFactor > 0.7) {
    // Strong hand - raise or bet
    if (validActions.includes('raise')) {
      const raiseAmount = game.currentBet + game.minRaise + Math.floor(Math.random() * game.bigBlind * 2);
      return { action: 'raise', amount: Math.min(raiseAmount, player.chips + player.bet) };
    }
  }

  if (handStrength + randomFactor > 0.4 || potOdds < 0.2) {
    // Decent hand or good pot odds - call/check
    if (validActions.includes('check')) return { action: 'check' };
    if (validActions.includes('call') && toCall < player.chips * 0.3) return { action: 'call' };
  }

  if (validActions.includes('check')) return { action: 'check' };

  // Weak hand - fold unless free
  if (toCall === 0 && validActions.includes('check')) return { action: 'check' };

  return { action: 'fold' };
}

// Convert game state to client-safe version (hide other players' cards)
export function toClientGameState(game: GameState, viewerId?: string): ClientGameState {
  const isShowdown = game.phase === 'showdown';

  const clientPlayers: ClientPlayer[] = game.players.map(player => ({
    id: player.id,
    name: player.name,
    chips: player.chips,
    cards: player.cards.map(card => {
      // Show cards if: it's showdown, or it's the viewer's own cards
      if (isShowdown || player.id === viewerId) {
        return card;
      }
      // Hide cards
      return player.cards.length > 0 ? null : null;
    }),
    bet: player.bet,
    status: player.status,
    isAI: player.isAI,
    isSpectator: player.isSpectator,
    seatIndex: player.seatIndex,
    isDisconnected: player.disconnectedAt !== undefined
  }));

  return {
    id: game.id,
    players: clientPlayers,
    communityCards: game.communityCards,
    pot: game.pot,
    sidePots: game.sidePots,
    currentBet: game.currentBet,
    minRaise: game.minRaise,
    dealerIndex: game.dealerIndex,
    currentPlayerIndex: game.currentPlayerIndex,
    phase: game.phase,
    smallBlind: game.smallBlind,
    bigBlind: game.bigBlind,
    lastAction: game.lastAction,
    winners: game.winners,
    myPlayerId: viewerId
  };
}
