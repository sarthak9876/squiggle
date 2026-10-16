import { describe, it, expect } from 'vitest';
import { slotKey } from '../src/lib/slotkey.js';
import { POOLS } from '../src/modes/index.js';
import { SLOTS } from '../src/lib/schedule.js';

/* Regression guard for the mode-swap crash.

   GameScreen seeds its answer state once per mount. If two different questions
   can share a key, React reuses the card and the new mode reads the old mode's
   value shape — which threw on 27 of the 56 ordered mode pairs when the key was
   just the question index. These tests fail if the key ever stops distinguishing
   one of the three things that can change about a slot. */
describe('slotKey', () => {
  it('differs for every ordered pair of modes at the same index', () => {
    const pairs = [];
    for (const a of SLOTS) {
      for (const b of SLOTS) {
        if (a === b) continue;
        const ka = slotKey({ mode: a, item: POOLS[a][0] }, 0);
        const kb = slotKey({ mode: b, item: POOLS[b][0] }, 0);
        if (ka === kb) pairs.push(`${a}->${b}`);
      }
    }
    expect(pairs).toEqual([]);
  });

  it('differs when the question changes within one mode', () => {
    const m = SLOTS[0];
    expect(slotKey({ mode: m, item: POOLS[m][0] }, 0))
      .not.toBe(slotKey({ mode: m, item: POOLS[m][1] }, 0));
  });

  it('differs when the same question appears at a different index', () => {
    const m = SLOTS[0];
    expect(slotKey({ mode: m, item: POOLS[m][0] }, 0))
      .not.toBe(slotKey({ mode: m, item: POOLS[m][0] }, 1));
  });

  it('never throws on a missing or half-built slot', () => {
    // App renders this key before it can know the lineup is non-empty; an
    // exception here would land in App's own render, above the ErrorBoundary.
    expect(() => slotKey(undefined, 0)).not.toThrow();
    expect(() => slotKey({ mode: 'size' }, 0)).not.toThrow();
  });

  it('gives every slot of a real daily lineup a distinct key', () => {
    const lineup = SLOTS.map(m => ({ mode: m, item: POOLS[m][0] }));
    const keys = lineup.map((s, i) => slotKey(s, i));
    expect(new Set(keys).size).toBe(keys.length);
  });
});
