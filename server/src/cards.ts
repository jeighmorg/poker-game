import { Card, Suit, Rank, HandResult, HandRank } from './types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getRankValue(rank: Rank): number {
  const values: Record<Rank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };
  return values[rank];
}

function getHandRankValue(rank: HandRank): number {
  const values: Record<HandRank, number> = {
    'high-card': 1,
    'pair': 2,
    'two-pair': 3,
    'three-of-a-kind': 4,
    'straight': 5,
    'flush': 6,
    'full-house': 7,
    'four-of-a-kind': 8,
    'straight-flush': 9,
    'royal-flush': 10
  };
  return values[rank];
}

function getHandRankName(rank: HandRank): string {
  const names: Record<HandRank, string> = {
    'high-card': 'High Card',
    'pair': 'Pair',
    'two-pair': 'Two Pair',
    'three-of-a-kind': 'Three of a Kind',
    'straight': 'Straight',
    'flush': 'Flush',
    'full-house': 'Full House',
    'four-of-a-kind': 'Four of a Kind',
    'straight-flush': 'Straight Flush',
    'royal-flush': 'Royal Flush'
  };
  return names[rank];
}

// Get all 5-card combinations from 7 cards
function getCombinations(cards: Card[], r: number): Card[][] {
  const results: Card[][] = [];

  function combine(start: number, combo: Card[]) {
    if (combo.length === r) {
      results.push([...combo]);
      return;
    }
    for (let i = start; i < cards.length; i++) {
      combo.push(cards[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  }

  combine(0, []);
  return results;
}

function evaluateFiveCards(cards: Card[]): HandResult {
  const sorted = [...cards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
  const ranks = sorted.map(c => getRankValue(c.rank));
  const suits = sorted.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  // Check for straight (including wheel: A-2-3-4-5)
  let isStraight = false;
  let straightHigh = 0;

  // Regular straight check
  if (ranks[0] - ranks[4] === 4 && new Set(ranks).size === 5) {
    isStraight = true;
    straightHigh = ranks[0];
  }
  // Wheel (A-2-3-4-5)
  if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
    isStraight = true;
    straightHigh = 5; // 5-high straight
  }

  // Count rank frequencies
  const rankCounts: Record<number, number> = {};
  for (const r of ranks) {
    rankCounts[r] = (rankCounts[r] || 0) + 1;
  }
  const counts = Object.values(rankCounts).sort((a, b) => b - a);

  // Determine hand rank
  let handRank: HandRank;
  let kickers: number[] = [];

  if (isStraight && isFlush) {
    if (ranks[0] === 14 && ranks[4] === 10) {
      handRank = 'royal-flush';
    } else {
      handRank = 'straight-flush';
    }
    kickers = [straightHigh];
  } else if (counts[0] === 4) {
    handRank = 'four-of-a-kind';
    const quadRank = parseInt(Object.entries(rankCounts).find(([_, c]) => c === 4)![0]);
    const kickerRank = parseInt(Object.entries(rankCounts).find(([_, c]) => c === 1)![0]);
    kickers = [quadRank, kickerRank];
  } else if (counts[0] === 3 && counts[1] === 2) {
    handRank = 'full-house';
    const tripRank = parseInt(Object.entries(rankCounts).find(([_, c]) => c === 3)![0]);
    const pairRank = parseInt(Object.entries(rankCounts).find(([_, c]) => c === 2)![0]);
    kickers = [tripRank, pairRank];
  } else if (isFlush) {
    handRank = 'flush';
    kickers = ranks;
  } else if (isStraight) {
    handRank = 'straight';
    kickers = [straightHigh];
  } else if (counts[0] === 3) {
    handRank = 'three-of-a-kind';
    const tripRank = parseInt(Object.entries(rankCounts).find(([_, c]) => c === 3)![0]);
    const otherRanks = Object.entries(rankCounts)
      .filter(([_, c]) => c === 1)
      .map(([r]) => parseInt(r))
      .sort((a, b) => b - a);
    kickers = [tripRank, ...otherRanks];
  } else if (counts[0] === 2 && counts[1] === 2) {
    handRank = 'two-pair';
    const pairRanks = Object.entries(rankCounts)
      .filter(([_, c]) => c === 2)
      .map(([r]) => parseInt(r))
      .sort((a, b) => b - a);
    const kickerRank = parseInt(Object.entries(rankCounts).find(([_, c]) => c === 1)![0]);
    kickers = [...pairRanks, kickerRank];
  } else if (counts[0] === 2) {
    handRank = 'pair';
    const pairRank = parseInt(Object.entries(rankCounts).find(([_, c]) => c === 2)![0]);
    const otherRanks = Object.entries(rankCounts)
      .filter(([_, c]) => c === 1)
      .map(([r]) => parseInt(r))
      .sort((a, b) => b - a);
    kickers = [pairRank, ...otherRanks];
  } else {
    handRank = 'high-card';
    kickers = ranks;
  }

  return {
    rank: handRank,
    rankValue: getHandRankValue(handRank),
    cards: sorted,
    kickers,
    description: getHandRankName(handRank)
  };
}

export function evaluateHand(holeCards: Card[], communityCards: Card[]): HandResult {
  const allCards = [...holeCards, ...communityCards];

  if (allCards.length < 5) {
    // Not enough cards yet, return high card
    const sorted = [...allCards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
    return {
      rank: 'high-card',
      rankValue: 1,
      cards: sorted,
      kickers: sorted.map(c => getRankValue(c.rank)),
      description: 'High Card'
    };
  }

  const combinations = getCombinations(allCards, 5);
  let bestHand: HandResult | null = null;

  for (const combo of combinations) {
    const result = evaluateFiveCards(combo);
    if (!bestHand || compareHands(result, bestHand) > 0) {
      bestHand = result;
    }
  }

  return bestHand!;
}

export function compareHands(a: HandResult, b: HandResult): number {
  if (a.rankValue !== b.rankValue) {
    return a.rankValue - b.rankValue;
  }

  // Compare kickers
  for (let i = 0; i < Math.min(a.kickers.length, b.kickers.length); i++) {
    if (a.kickers[i] !== b.kickers[i]) {
      return a.kickers[i] - b.kickers[i];
    }
  }

  return 0; // Tie
}
