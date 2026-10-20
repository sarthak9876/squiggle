import { describe, it, expect, beforeAll } from 'vitest';
import { mergeInflight } from '../src/lib/storage.js';
import { save } from '../src/lib/storage.js';
import { modeStats } from '../src/lib/stats.js';

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

/* "Your best on this game" and "Your average" are computed from saved answers
   plus the run in progress. Only a DAILY run is ever saved — archive goes to
   s.archive and practice is deleted on finish — so folding a practice run into
   the in-flight list let you grind a mode until the number flattered you, and
   then lose it on reload. The gate is the `banked` prop; this pins the storage
   side of it, that practice never reaches s.answers at all. */
describe('practice never pollutes the saved stats', () => {
  /* storage.js wraps every call in try/catch so the game works in a private
     window, which means a missing localStorage fails SILENTLY — load() returns
     {} and the test would pass on nothing. A real Map-backed stub, so what is
     saved is actually read back. */
  beforeAll(() => {
    const m = new Map();
    globalThis.localStorage = {
      getItem: k => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: k => m.delete(k),
      clear: () => m.clear(),
    };
  });

  it('modeStats reads only s.answers, which holds daily runs', () => {
    localStorage.clear();
    save({
      answers: { 100: [{ mode: 'size', score: 40 }] },
      archive: { 99: { total: 500, answers: [{ mode: 'size', score: 100 }] } },
      practice: { size: { answers: [{ mode: 'size', score: 100 }] } },
    });
    const st = modeStats('size');
    expect(st.n, 'archive or practice leaked in').toBe(1);
    expect(st.best).toBe(40);
    expect(st.mean).toBe(40);
  });

  /* The in-flight list is the caller's job to withhold, so prove the shape it
     has to withhold: passing a practice answer DOES move the number. That is
     why GameScreen passes [] unless the run is banked. */
  it('an in-flight answer does move best, so the caller must gate it', () => {
    localStorage.clear();
    save({ answers: { 100: [{ mode: 'size', score: 40 }] } });
    expect(modeStats('size', [{ mode: 'size', score: 95 }]).best).toBe(95);
  });
});
