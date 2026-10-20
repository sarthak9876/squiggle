import { describe, it, expect } from 'vitest';
import { order } from '../src/modes/order.jsx';
import { POOLS } from '../src/modes/index.js';

/* QA: "Q8 started with Russia already in 1st place; submitting without touching
   anything scored 60/100." A start position that scores is not a puzzle. */
describe('Put In Order — the opening shuffle', () => {
  it('never scores above zero untouched, on any question in the bank', () => {
    const scored = POOLS.order.map(q => ({ id: q.id, s: order.score(q, order.init(q)) }));
    const worst = scored.filter(x => x.s > 0);
    expect(worst, worst.map(x => `${x.id} scores ${x.s} untouched`).join('\n')).toEqual([]);
  });

  it('never opens with the true first or last card already in place', () => {
    const bad = [];
    for (const q of POOLS.order) {
      const vals = q.items.map(x => x[1]);
      const truth = q.items.map((_, i) => i).sort((a, b) => (vals[b] - vals[a]) * (q.asc ? -1 : 1));
      const { seq } = order.init(q);
      if (seq[0] === truth[0]) bad.push(`${q.id}: true first card opens in slot 1`);
      if (seq[seq.length - 1] === truth[truth.length - 1]) bad.push(`${q.id}: true last card opens last`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('scrambles at least 60% of pairs', () => {
    const thin = [];
    for (const q of POOLS.order) {
      const vals = q.items.map(x => x[1]);
      const { seq } = order.init(q);
      let d = 0, t = 0;
      for (let i = 0; i < seq.length; i++)
        for (let j = i + 1; j < seq.length; j++) { t++; if ((vals[seq[i]] - vals[seq[j]]) * (q.asc ? -1 : 1) <= 0) d++; }
      if (d / t < 0.6) thin.push(`${q.id}: only ${d}/${t} pairs scrambled`);
    }
    expect(thin, thin.join('\n')).toEqual([]);
  });

  it('is deterministic — the same question always opens the same way', () => {
    for (const q of POOLS.order.slice(0, 6))
      expect(order.init(q).seq).toEqual(order.init(q).seq);
  });

  it('still scores a correct answer 100', () => {
    for (const q of POOLS.order) {
      const vals = q.items.map(x => x[1]);
      const seq = q.items.map((_, i) => i).sort((a, b) => (vals[b] - vals[a]) * (q.asc ? -1 : 1));
      expect(order.score(q, { seq }), q.id).toBe(100);
    }
  });
});

/* Regression guard for the inverted-prompt bug found in pre-launch review.

   The engine only ever scored descending-by-value, but six prompts ask for the
   smallest first ("Closest to the Sun first", "Oldest company first"). A player
   who answered those perfectly scored 0, and the reveal animated the cards into
   the reversed order and presented it as fact — Neptune as the planet closest
   to the Sun. Fixed with `asc: true` on those items; these tests assert the
   property for the WHOLE pool so a new question cannot reintroduce it. */
describe('Put In Order — prompt direction', () => {
  it('answering correctly scores 100 on every question', async () => {
    const { order } = await import('../src/modes/order.jsx');
    for (const q of POOLS.order) {
      const correct = q.items.map((_, i) => i)
        .sort((a, b) => (q.asc ? q.items[a][1] - q.items[b][1] : q.items[b][1] - q.items[a][1]));
      expect(order.score(q, { seq: correct, sel: null }), `${q.id} "${q.prompt}"`).toBe(100);
    }
  });

  it('the reveal teaches the same order it scores', async () => {
    const { order } = await import('../src/modes/order.jsx');
    for (const q of POOLS.order) {
      const correct = q.items.map((_, i) => i)
        .sort((a, b) => (q.asc ? q.items[a][1] - q.items[b][1] : q.items[b][1] - q.items[a][1]));
      // detail() counts pairs the same way score() does, so a perfect answer
      // must report every pair right — if the reveal disagreed with the score,
      // this is where it would show.
      const d = order.detail(q, { seq: correct, sel: null });
      const [got, total] = d.match(/\d+/g).map(Number);
      expect(got, `${q.id} detail: ${d}`).toBe(total);
    }
  });

  it('no opening position is worth free points', async () => {
    const { order } = await import('../src/modes/order.jsx');
    for (const q of POOLS.order)
      expect(order.score(q, order.init(q)), `${q.id} untouched opening`).toBeLessThan(60);
  });
});

/* Regression guard: Order used to ship `ready: () => true`.

   Every other mode shows a disabled "Pick an answer" until the player acts.
   Order alone had a live "Submit", so the most prominent control on the screen
   scored the deliberately-scrambled opening — roughly zero — before the player
   had moved anything, and then explained "4 of 10 pairs in the right order". */
describe('Put In Order — submit gating', () => {
  it('cannot be submitted before a move', async () => {
    const { order } = await import('../src/modes/order.jsx');
    for (const q of POOLS.order) expect(order.ready(order.init(q)), q.id).toBe(false);
  });

  it('can be submitted once a card has moved', async () => {
    const { order } = await import('../src/modes/order.jsx');
    for (const q of POOLS.order) {
      const v = order.init(q);
      const seq = v.seq.slice();
      [seq[0], seq[1]] = [seq[1], seq[0]];
      expect(order.ready({ ...v, seq, touched: true }), q.id).toBe(true);
    }
  });

  it('clear() returns to an unsubmittable state', async () => {
    const { order } = await import('../src/modes/order.jsx');
    for (const q of POOLS.order) expect(order.ready(order.clear(q)), q.id).toBe(false);
  });
});

/* The opening shuffle maximised discordant pairs, and the arrangement with the
   MOST discordant pairs is the exact reverse — so it handed out boards whose
   entire solution was "reverse it". A playtest hit one: Hottest first opening
   as water, candle, lava, lightning, sun. */
describe('the opening board is never the answer or its mirror', () => {
  it('no question opens sorted or exactly reversed', () => {
    const bad = [];
    for (const q of POOLS.order) {
      const vals = order.init(q).seq.map(i => q.items[i][1]);
      const asc  = vals.every((x, i, a) => i === 0 || a[i - 1] <= x);
      const desc = vals.every((x, i, a) => i === 0 || a[i - 1] >= x);
      if (q.asc ? desc : asc) bad.push(`${q.id}: opens in the answer order`);
      if (q.asc ? asc : desc) bad.push(`${q.id}: opens exactly reversed`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });
});
