import { describe, it, expect } from 'vitest';
import { mergeInflight } from '../src/lib/storage.js';

/* Two tabs on the same browser share one storage key. The inflight write used to
   be last-writer-wins on this tab's in-memory list, so a tab left open on
   question 6 wrote over storage already holding 8 and the player watched a
   reload roll them backwards. Measured before the fix: tab C sat on question 8,
   a stale tab answered, C reloaded onto question 7. */

const ans = n => Array.from({ length: n }, (_, i) => ({ mode: 'share', score: i }));

describe('a second tab can never roll your progress back', () => {
  it('keeps the longer list when this tab is behind', () => {
    const stored = { day: 10, idx: 8, answers: ans(8) };
    const out = mergeInflight(stored, ans(7), 10);
    expect(out.idx).toBe(8);
    expect(out.answers).toHaveLength(8);
  });

  it('takes this tab when it is the one making progress', () => {
    const stored = { day: 10, idx: 5, answers: ans(5) };
    const out = mergeInflight(stored, ans(6), 10);
    expect(out.idx).toBe(6);
  });

  it('normal single-tab play is untouched — every answer advances', () => {
    let stored = null;
    for (let n = 1; n <= 16; n++) {
      stored = mergeInflight(stored, ans(n), 10);
      expect(stored.idx, `answer ${n}`).toBe(n);
    }
  });

  it('yesterday’s answers never leak into today', () => {
    // The day rolls over at local midnight; a stale tab may still hold it.
    const yesterday = { day: 9, idx: 12, answers: ans(12) };
    const out = mergeInflight(yesterday, ans(1), 10);
    expect(out.day).toBe(10);
    expect(out.idx).toBe(1);
  });

  it('survives a half-written or empty record', () => {
    for (const junk of [null, undefined, {}, { day: 10 }, { day: 10, answers: null }])
      expect(() => mergeInflight(junk, ans(3), 10)).not.toThrow();
    expect(mergeInflight({ day: 10, answers: null }, ans(3), 10).idx).toBe(3);
  });
});
