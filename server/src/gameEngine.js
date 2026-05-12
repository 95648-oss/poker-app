'use strict';

const { bestHand, compare } = require('./handEvaluator');

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

function createDeck() {
  return SUITS.flatMap(s => RANKS.map(r => ({ suit: s, rank: r })));
}

function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function initGame(players, settings) {
  return {
    players: players.map(p => ({
      id: p.id,
      name: p.name,
      chips: settings.startingChips,
      bet: 0,
      totalBet: 0,
      holeCards: [],
      folded: false,
      allIn: false,
      needsToAct: false,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      connected: true,
    })),
    settings,
    deck: [],
    communityCards: [],
    currentBet: 0,
    minRaise: settings.bigBlind,
    pot: 0,
    phase: 'waiting',
    dealerIndex: -1,
    currentPlayerIndex: -1,
    handNumber: 0,
    winners: null,
    showdownHands: null,
  };
}

// Returns next index of an active (not folded, has chips) player after fromIndex
function nextActive(players, fromIndex) {
  const n = players.length;
  for (let offset = 1; offset < n; offset++) {
    const i = (fromIndex + offset) % n;
    if (!players[i].folded && players[i].chips > 0) return i;
  }
  return fromIndex;
}

// Returns next index that needsToAct after fromIndex, or -1 if none
function nextNeedsAct(players, fromIndex) {
  const n = players.length;
  for (let offset = 1; offset <= n; offset++) {
    const i = (fromIndex + offset) % n;
    if (!players[i].folded && !players[i].allIn && players[i].needsToAct) return i;
  }
  return -1;
}

// First active non-all-in player clockwise after dealerIndex for post-flop
function firstToActPostFlop(players, dealerIndex) {
  const n = players.length;
  for (let offset = 1; offset <= n; offset++) {
    const i = (dealerIndex + offset) % n;
    if (!players[i].folded && !players[i].allIn && players[i].chips > 0) return i;
  }
  return -1;
}

function activePlayers(players) {
  return players.filter(p => !p.folded);
}

function bettablePlayers(players) {
  return players.filter(p => !p.folded && !p.allIn && p.chips > 0);
}

// Calculate side pots from totalBet contributions
function calculateSidePots(players) {
  const contribs = players.map(p => ({ id: p.id, totalBet: p.totalBet, folded: p.folded }));
  const levels = [...new Set(contribs.map(c => c.totalBet).filter(b => b > 0))].sort((a, b) => a - b);

  const pots = [];
  let prevLevel = 0;

  for (const level of levels) {
    let potAmount = 0;
    const eligible = [];

    for (const c of contribs) {
      const contrib = Math.min(c.totalBet, level) - prevLevel;
      if (contrib > 0) potAmount += contrib;
      if (!c.folded && c.totalBet >= level) eligible.push(c.id);
    }

    if (potAmount > 0) {
      if (eligible.length === 0 && pots.length > 0) {
        // Folded chips at this level go to the last pot's winners
        pots[pots.length - 1].amount += potAmount;
      } else if (eligible.length > 0) {
        pots.push({ amount: potAmount, eligible });
      }
    }
    prevLevel = level;
  }

  return pots;
}

function doShowdown(game) {
  const allCards = game.communityCards;
  const nonFolded = game.players.filter(p => !p.folded);

  const hands = nonFolded.map(p => ({
    playerId: p.id,
    hand: bestHand([...p.holeCards, ...allCards]),
  }));

  const sidePots = calculateSidePots(game.players);
  const players = game.players.map(p => ({ ...p }));
  const winnerRecords = [];

  for (const pot of sidePots) {
    const eligible = hands.filter(h => pot.eligible.includes(h.playerId));
    if (eligible.length === 0) continue;

    const best = eligible.reduce((a, b) => compare(a.hand, b.hand) >= 0 ? a : b);
    const tied = eligible.filter(h => compare(h.hand, best.hand) === 0);

    const share = Math.floor(pot.amount / tied.length);
    const remainder = pot.amount % tied.length;

    tied.forEach((h, idx) => {
      const amount = share + (idx === 0 ? remainder : 0);
      const pl = players.find(p => p.id === h.playerId);
      if (pl) pl.chips += amount;
      winnerRecords.push({
        playerId: h.playerId,
        amount,
        handName: h.hand.name,
        potDescription: sidePots.length > 1 ? `${pot.amount} pot` : 'main pot',
      });
    });
  }

  return {
    ...game,
    players,
    pot: 0,
    currentBet: 0,
    phase: 'showdown',
    winners: winnerRecords,
    showdownHands: hands.map(h => ({
      playerId: h.playerId,
      handName: h.hand.name,
      bestCards: h.hand.cards,
    })),
    currentPlayerIndex: -1,
  };
}

// Deal remaining community cards without betting, then showdown
function dealToShowdown(game) {
  let deck = [...game.deck];
  let communityCards = [...game.communityCards];

  while (communityCards.length < 5) {
    communityCards.push(deck.shift());
  }

  return doShowdown({ ...game, deck, communityCards });
}

function beginBettingRound(game, firstPlayerIndex) {
  const players = game.players.map(p => ({
    ...p,
    bet: 0,
    needsToAct: !p.folded && !p.allIn && p.chips > 0,
  }));

  // If only 0 or 1 player can bet, skip straight to next phase
  if (bettablePlayers(players).length <= 1) {
    return advancePhase({ ...game, players, currentBet: 0, minRaise: game.settings.bigBlind });
  }

  return {
    ...game,
    players,
    currentBet: 0,
    minRaise: game.settings.bigBlind,
    currentPlayerIndex: firstPlayerIndex >= 0 ? firstPlayerIndex : firstToActPostFlop(players, game.dealerIndex),
  };
}

function advancePhase(game) {
  const { phase, deck, communityCards, dealerIndex, settings } = game;

  if (phase === 'preflop') {
    const newDeck = [...deck];
    const newComm = [newDeck.shift(), newDeck.shift(), newDeck.shift()];
    const next = { ...game, deck: newDeck, communityCards: newComm, phase: 'flop' };
    const firstIdx = firstToActPostFlop(next.players, dealerIndex);
    return beginBettingRound(next, firstIdx);
  }

  if (phase === 'flop') {
    const newDeck = [...deck];
    const newComm = [...communityCards, newDeck.shift()];
    const next = { ...game, deck: newDeck, communityCards: newComm, phase: 'turn' };
    const firstIdx = firstToActPostFlop(next.players, dealerIndex);
    return beginBettingRound(next, firstIdx);
  }

  if (phase === 'turn') {
    const newDeck = [...deck];
    const newComm = [...communityCards, newDeck.shift()];
    const next = { ...game, deck: newDeck, communityCards: newComm, phase: 'river' };
    const firstIdx = firstToActPostFlop(next.players, dealerIndex);
    return beginBettingRound(next, firstIdx);
  }

  if (phase === 'river') {
    return doShowdown(game);
  }

  return game;
}

function startHand(game) {
  const eligible = game.players.filter(p => p.chips > 0);
  if (eligible.length < 2) {
    return { ...game, phase: 'gameOver' };
  }

  const n = game.players.length;

  // Advance dealer to next eligible player
  let newDealerIdx = game.dealerIndex;
  do {
    newDealerIdx = (newDealerIdx + 1) % n;
  } while (game.players[newDealerIdx].chips <= 0);

  const { smallBlind, bigBlind } = game.settings;

  // Reset all players
  let players = game.players.map(p => ({
    ...p,
    bet: 0,
    totalBet: 0,
    holeCards: [],
    folded: p.chips <= 0, // eliminated = folded
    allIn: false,
    needsToAct: false,
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
  }));

  players[newDealerIdx].isDealer = true;

  const activeCount = players.filter(p => !p.folded).length;
  let sbIdx, bbIdx;

  if (activeCount === 2) {
    // Heads-up: dealer = SB
    sbIdx = newDealerIdx;
    bbIdx = nextActive(players, sbIdx);
  } else {
    sbIdx = nextActive(players, newDealerIdx);
    bbIdx = nextActive(players, sbIdx);
  }

  players[sbIdx].isSmallBlind = true;
  players[bbIdx].isBigBlind = true;

  // Shuffle and deal
  const deck = shuffle(createDeck());
  let deckIdx = 0;
  for (const p of players) {
    if (!p.folded) {
      p.holeCards = [deck[deckIdx++], deck[deckIdx++]];
    }
  }

  // Post blinds
  const sbAmt = Math.min(smallBlind, players[sbIdx].chips);
  players[sbIdx].chips -= sbAmt;
  players[sbIdx].bet = sbAmt;
  players[sbIdx].totalBet = sbAmt;
  if (players[sbIdx].chips === 0) players[sbIdx].allIn = true;

  const bbAmt = Math.min(bigBlind, players[bbIdx].chips);
  players[bbIdx].chips -= bbAmt;
  players[bbIdx].bet = bbAmt;
  players[bbIdx].totalBet = bbAmt;
  if (players[bbIdx].chips === 0) players[bbIdx].allIn = true;

  const pot = sbAmt + bbAmt;
  const currentBet = bbAmt;

  // All active non-all-in players need to act (including BB for option)
  players.forEach(p => {
    if (!p.folded && !p.allIn) p.needsToAct = true;
  });

  // Pre-flop: UTG acts first (player after BB).
  // In heads-up, SB/Dealer acts first pre-flop (standard heads-up rule).
  let firstToAct;
  if (activeCount === 2) {
    // Heads-up: SB (dealer) acts first pre-flop; BB gets option last
    firstToAct = sbIdx;
  } else {
    firstToAct = nextActive(players, bbIdx);
    // Ensure the first player actually needs to act
    if (players[firstToAct].allIn) {
      firstToAct = nextNeedsAct(players, bbIdx);
      if (firstToAct === -1) firstToAct = bbIdx;
    }
  }

  return {
    ...game,
    players,
    deck: deck.slice(deckIdx),
    communityCards: [],
    currentBet,
    minRaise: bigBlind,
    pot,
    phase: 'preflop',
    dealerIndex: newDealerIdx,
    currentPlayerIndex: firstToAct,
    handNumber: game.handNumber + 1,
    winners: null,
    showdownHands: null,
  };
}

function executeAction(game, playerId, action, amount) {
  const playerIndex = game.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1 || playerIndex !== game.currentPlayerIndex) {
    return { game, error: 'Not your turn' };
  }

  const p = game.players[playerIndex];
  if (p.folded || p.allIn) return { game, error: 'Invalid action' };

  let players = game.players.map(pl => ({ ...pl }));
  let { currentBet, minRaise, pot } = game;
  const actor = players[playerIndex];
  const toCall = Math.min(currentBet - actor.bet, actor.chips);

  switch (action) {
    case 'fold':
      actor.folded = true;
      actor.needsToAct = false;
      break;

    case 'check':
      if (toCall > 0) return { game, error: 'Cannot check, must call or fold' };
      actor.needsToAct = false;
      break;

    case 'call': {
      if (toCall === 0) { actor.needsToAct = false; break; }
      pot += toCall;
      actor.chips -= toCall;
      actor.bet += toCall;
      actor.totalBet += toCall;
      if (actor.chips === 0) actor.allIn = true;
      actor.needsToAct = false;
      break;
    }

    case 'raise': {
      // amount = total chips actor is putting in this round on top of nothing
      // We interpret amount as the NEW total bet they want to have this round
      const newBet = Math.min(amount, actor.chips + actor.bet);
      const toAdd = newBet - actor.bet;

      if (toAdd <= 0) return { game, error: 'Invalid raise amount' };

      const raiseBy = newBet - currentBet;
      if (raiseBy < minRaise && toAdd < actor.chips) {
        return { game, error: 'Raise too small' };
      }

      pot += toAdd;
      actor.chips -= toAdd;
      actor.totalBet += toAdd;
      actor.bet = newBet;

      if (actor.chips === 0) actor.allIn = true;
      actor.needsToAct = false;

      if (newBet > currentBet) {
        const raiseIncrease = newBet - currentBet;
        if (raiseIncrease >= minRaise) minRaise = raiseIncrease;
        currentBet = newBet;
        // Everyone else who can act must act again
        players.forEach((pl, i) => {
          if (i !== playerIndex && !pl.folded && !pl.allIn) pl.needsToAct = true;
        });
      }
      break;
    }

    case 'allin': {
      const allInAmt = actor.chips;
      pot += allInAmt;
      actor.totalBet += allInAmt;
      actor.bet += allInAmt;
      actor.chips = 0;
      actor.allIn = true;
      actor.needsToAct = false;

      if (actor.bet > currentBet) {
        const raiseIncrease = actor.bet - currentBet;
        if (raiseIncrease >= minRaise) minRaise = raiseIncrease;
        currentBet = actor.bet;
        players.forEach((pl, i) => {
          if (i !== playerIndex && !pl.folded && !pl.allIn) pl.needsToAct = true;
        });
      }
      break;
    }

    default:
      return { game, error: 'Unknown action' };
  }

  // Replace the actor in players
  players[playerIndex] = actor;

  // Check: only 1 non-folded player left
  const stillActive = activePlayers(players);
  if (stillActive.length === 1) {
    const winner = players.find(pl => !pl.folded);
    winner.chips += pot;
    return {
      game: {
        ...game,
        players,
        pot: 0,
        currentBet,
        minRaise,
        currentPlayerIndex: -1,
        phase: 'handEnd',
        winners: [{ playerId: winner.id, amount: pot, handName: 'Last player standing' }],
        showdownHands: null,
      },
    };
  }

  // Check if betting round is over
  const nextIdx = nextNeedsAct(players, playerIndex);
  if (nextIdx === -1) {
    // All betting done — deal remaining community cards if everyone is all-in
    const canBet = bettablePlayers(players);
    const newGame = { ...game, players, pot, currentBet, minRaise };

    if (canBet.length <= 1 && game.phase !== 'river') {
      return { game: dealToShowdown(advancePhaseCards(newGame)) };
    }
    return { game: advancePhase(newGame) };
  }

  return {
    game: {
      ...game,
      players,
      pot,
      currentBet,
      minRaise,
      currentPlayerIndex: nextIdx,
    },
  };
}

// Deal cards for all remaining phases without betting
function advancePhaseCards(game) {
  let g = game;
  while (g.phase !== 'river' && g.communityCards.length < 5) {
    const deck = [...g.deck];
    let communityCards = [...g.communityCards];

    if (g.phase === 'preflop') {
      communityCards = [deck.shift(), deck.shift(), deck.shift()];
      g = { ...g, deck, communityCards, phase: 'flop' };
    } else if (g.phase === 'flop') {
      communityCards = [...communityCards, deck.shift()];
      g = { ...g, deck, communityCards, phase: 'turn' };
    } else if (g.phase === 'turn') {
      communityCards = [...communityCards, deck.shift()];
      g = { ...g, deck, communityCards, phase: 'river' };
    } else break;
  }
  return g;
}

// Filter game state for a specific viewer (hide other players' hole cards)
function getPublicState(game, viewerPlayerId) {
  if (!game) return null;
  return {
    ...game,
    deck: undefined, // never expose the deck
    players: game.players.map(p => ({
      ...p,
      holeCards: (() => {
        if (p.id === viewerPlayerId) return p.holeCards;
        // At showdown reveal all non-folded cards
        if (game.phase === 'showdown' || game.phase === 'handEnd') {
          return p.folded ? [] : p.holeCards;
        }
        return p.holeCards.map(() => ({ hidden: true }));
      })(),
    })),
  };
}

module.exports = { initGame, startHand, executeAction, getPublicState, calculateSidePots };
