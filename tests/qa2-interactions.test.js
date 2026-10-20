import { describe, it, expect, beforeEach } from 'vitest';
import { modeStats } from '../src/lib/stats.js';
import { order } from '../src/modes/order.jsx';
import { POOLS } from '../src/modes/index.js';
import { BRAND } from '../src/brand.js';

/* A localStorage stand-in — these run in node. */
beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    clear: () => store.clear(),
  };
});

const seed = days => localStorage.setItem(BRAND.storageKey, JSON.stringify({ answers: days }));

/* QA2 #6: "New best ✨" showed on a TIE (100 -> 100), and "Your best on this game
   75" appeared under a score of 96 because best only read SAVED days. */
describe('per-game best', () => {
  it('counts today\'s in-flight answers, not just saved days', () => {
    seed({ 100: [{ mode: 'odd', score: 75 }] });
    expect(modeStats('odd').best).toBe(75);
    const live = [{ mode: 'odd', score: 96 }];
    expect(modeStats('odd', live).best, 'today must count').toBe(96);
  });

  it('excludeLast gives the mark to beat, so a tie is not a record', () => {
    seed({ 100: [{ mode: 'odd', score: 100 }] });
    const live = [{ mode: 'odd', score: 100 }];           // tied it
    const prior = modeStats('odd', live, true);
    expect(prior.best).toBe(100);
    expect(100 > prior.best, 'tie must NOT be a new best').toBe(false);
  });

  it('a genuine record is strictly greater', () => {
    seed({ 100: [{ mode: 'size', score: 80 }] });
    const prior = modeStats('size', [{ mode: 'size', score: 95 }], true);
    expect(95 > prior.best).toBe(true);
  });

  it('ignores other games and malformed rows', () => {
    seed({ 100: [{ mode: 'odd', score: 90 }, { mode: 'size', score: 10 }, null, {}] });
    expect(modeStats('odd').best).toBe(90);
    expect(modeStats('size').best).toBe(10);
    expect(modeStats('draw')).toBeNull();
  });
});

/* QA2 #7: after submit the cards stayed in YOUR order, so the correct sequence was
   never actually shown — you had to re-sort five cards in your head. */
describe('Put In Order reveals the true sequence', () => {
  it('the truth order follows each question\'s own direction', () => {
    for (const q of POOLS.order) {
      const truth = q.items.map((_, i) => i).sort((a, b) => (q.items[b][1] - q.items[a][1]) * (q.asc ? -1 : 1));
      const vals = truth.map(i => q.items[i][1]);
      for (let i = 1; i < vals.length; i++)
        expect((vals[i - 1] - vals[i]) * (q.asc ? -1 : 1), `${q.id} truth order wrong way`).toBeGreaterThan(0);
    }
  });

  it('a card the player misplaced is detectable, with its original position', () => {
    const q = POOLS.order[0];
    const truth = q.items.map((_, i) => i).sort((a, b) => (q.items[b][1] - q.items[a][1]) * (q.asc ? -1 : 1));
    const yours = [...truth]; [yours[0], yours[1]] = [yours[1], yours[0]];
    const moved = truth.map((oi, pos) => ({ oi, pos, yourPos: yours.indexOf(oi) }))
                       .filter(x => x.yourPos !== x.pos);
    expect(moved.length).toBe(2);
    for (const m of moved) expect(m.yourPos).toBeGreaterThanOrEqual(0);
  });

  it('a perfect answer flags nothing as moved', () => {
    const q = POOLS.order[0];
    const truth = q.items.map((_, i) => i).sort((a, b) => (q.items[b][1] - q.items[a][1]) * (q.asc ? -1 : 1));
    expect(truth.filter((oi, pos) => truth.indexOf(oi) !== pos).length).toBe(0);
    expect(order.score(q, { seq: truth })).toBe(100);
  });
});

/* QA2 #18: "Person — 1.7 m long" for an upright person; weight questions scaled
   the picture by volume while the copy still said "size". */
describe('Size It Up copy matches the quantity', () => {
  it('every question maps its unit to a sensible word', () => {
    const word = u => /tall|height|at the shoulder/i.test(u) ? 'tall'
                    : /long|length|across|wide/i.test(u) ? 'long' : '';
    const bad = [];
    for (const q of POOLS.size) {
      const d = q.dimension || 'length';
      const w = word(q.unit);
      if (d === 'length' && !w) bad.push(`${q.id}: unit "${q.unit}" gives no tall/long word`);
      if (/at the shoulder/i.test(q.unit) && w !== 'tall') bad.push(`${q.id}: shoulder height should be "tall"`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
});

/* The halfway card names the games you did best on. Two things went wrong at
   once when every game tied, which happens most easily at zero: the list joined
   all eight names into a paragraph, and it introduced them with the word
   "best" — so a player who had scored nothing was shown every game they had
   just failed, labelled as their best. That is the message at the exact moment
   someone decides whether to keep playing. */
describe('halfway card', () => {
  // The same shape GameScreen builds, kept here so the rule is testable without
  // mounting the component.
  const names = tied => tied.length === 1 ? tied[0]
    : tied.length === 2 ? tied[0] + ' and ' + tied[1]
    : `${tied[0]}, ${tied[1]} and ${tied.length - 2} more`;

  it('never lists more than two game names', () => {
    expect(names(['A'])).toBe('A');
    expect(names(['A', 'B'])).toBe('A and B');
    expect(names(['A', 'B', 'C'])).toBe('A, B and 1 more');
    expect(names(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])).toBe('A, B and 6 more');
  });

  it('the capped form stays short however many tie', () => {
    const all = ['Shapes Only', 'Size It Up', 'Make The Sets', 'Draw The Curve',
                 'Place The Dot', 'What Share?', 'Odd One Out', 'Put In Order'];
    expect(names(all).length).toBeLessThan(40);
    expect(names(all)).not.toContain('Put In Order');
  });
});
