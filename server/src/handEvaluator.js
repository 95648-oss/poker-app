'use strict';

const RANK_ORDER = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const RANK_VALUE = Object.fromEntries(RANK_ORDER.map((r, i) => [r, i + 2]));

const HAND_NAMES = [
  'High Card','One Pair','Two Pair','Three of a Kind',
  'Straight','Flush','Full House','Four of a Kind','Straight Flush',
];

function rv(card) { return RANK_VALUE[card.rank]; }

function evaluate5(cards) {
  const ranks = cards.map(rv).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);

  const freq = {};
  ranks.forEach(r => { freq[r] = (freq[r] || 0) + 1; });
  const groups = Object.entries(freq)
    .map(([r, c]) => ({ r: +r, c }))
    .sort((a, b) => b.c - a.c || b.r - a.r);
  const counts = groups.map(g => g.c);

  let isStraight = false;
  let straightTop = ranks[0];
  if (new Set(ranks).size === 5) {
    if (ranks[0] - ranks[4] === 4) {
      isStraight = true;
    } else if (ranks[0] === 14 && ranks[1] === 5) {
      // Wheel: A-2-3-4-5
      isStraight = true;
      straightTop = 5;
    }
  }

  let rank, tb;
  if (isFlush && isStraight) {
    rank = 8; tb = [straightTop];
  } else if (counts[0] === 4) {
    rank = 7; tb = [groups[0].r, groups[1].r];
  } else if (counts[0] === 3 && counts[1] === 2) {
    rank = 6; tb = [groups[0].r, groups[1].r];
  } else if (isFlush) {
    rank = 5; tb = ranks;
  } else if (isStraight) {
    rank = 4; tb = [straightTop];
  } else if (counts[0] === 3) {
    rank = 3; tb = groups.map(g => g.r);
  } else if (counts[0] === 2 && counts[1] === 2) {
    rank = 2; tb = groups.map(g => g.r);
  } else if (counts[0] === 2) {
    rank = 1; tb = groups.map(g => g.r);
  } else {
    rank = 0; tb = ranks;
  }

  return { rank, tb };
}

function compare(h1, h2) {
  if (h1.rank !== h2.rank) return h1.rank - h2.rank;
  for (let i = 0; i < Math.max(h1.tb.length, h2.tb.length); i++) {
    const d = (h1.tb[i] || 0) - (h2.tb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

function combos(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [h, ...t] = arr;
  return [...combos(t, k - 1).map(c => [h, ...c]), ...combos(t, k)];
}

function bestHand(cards7) {
  let best = null, bestCards = null;
  for (const c5 of combos(cards7, 5)) {
    const ev = evaluate5(c5);
    if (!best || compare(ev, best) > 0) { best = ev; bestCards = c5; }
  }
  return { ...best, cards: bestCards, name: HAND_NAMES[best.rank] };
}

module.exports = { bestHand, compare, HAND_NAMES };
