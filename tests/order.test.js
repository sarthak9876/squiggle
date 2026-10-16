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
      const truth = q.items.map((_, i) => i).sort((a, b) => vals[b] - vals[a]);
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
        for (let j = i + 1; j < seq.length; j++) { t++; if (vals[seq[i]] <= vals[seq[j]]) d++; }
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
      const seq = q.items.map((_, i) => i).sort((a, b) => vals[b] - vals[a]);
      expect(order.score(q, { seq }), q.id).toBe(100);
    }
  });
});
