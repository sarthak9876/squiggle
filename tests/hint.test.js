import { describe, it, expect } from 'vitest';
import { HINT_KEEP, applyHint } from '../src/lib/hint.js';
import { POOLS, hintOf, promptOf } from '../src/modes/index.js';

describe('hints', () => {
  it('an un-hinted answer is never reduced', () => {
    for (const raw of [0, 1, 37, 80, 99, 100]) expect(applyHint(raw, false)).toBe(raw);
  });

  it('a hinted answer keeps three quarters, rounded', () => {
    expect(applyHint(100, true)).toBe(75);
    expect(applyHint(80, true)).toBe(60);
    expect(applyHint(0, true)).toBe(0);
    expect(applyHint(37, true)).toBe(28);   // 27.75 rounds to 28
  });

  it('a hint can never be worth more than answering without one', () => {
    for (let raw = 0; raw <= 100; raw++)
      expect(applyHint(raw, true), `raw ${raw}`).toBeLessThanOrEqual(raw);
  });

  it('every hint explains the subject without giving away a number', () => {
    let n = 0;
    for (const pool of Object.values(POOLS))
      for (const q of pool) {
        const h = hintOf(q);
        if (!h) continue;
        n++;
        expect(h.length, `${q.id} hint too short`).toBeGreaterThan(24);
        expect(h.length, `${q.id} hint too long to read mid-question`).toBeLessThan(220);
        // The hint names WHAT the thing is. If it repeated the answer the
        // question would be free, which is the one thing it must never do.
        if (typeof q.answer === 'number')
          expect(h.includes(String(q.answer)), `${q.id} hint contains the answer`).toBe(false);
      }
    expect(n, 'questions carrying a hint').toBeGreaterThan(0);
  });

  it('HINT_KEEP stays a visible fraction, not a silent zero', () => {
    expect(HINT_KEEP).toBeGreaterThan(0.5);
    expect(HINT_KEEP).toBeLessThan(1);
  });
});
