/* Schedule guarantees.

   Three real bugs motivated every assertion here: the same "which came first"
   appeared twice in one day, a giraffe question repeated four days later, and the
   archive offered days before the game existed. */
import { describe, it, expect } from 'vitest';
import { POOLS } from '../src/modes/index.js';
import { lineupFor, SLOTS, PER_DAY, uniqueDays, signatureOf, LAUNCH_DAY, MIN_INDIA } from '../src/lib/schedule.js';

const PLAYERS = ['alice', 'bob', 'p-1291', 'zz'];

describe('a single day', () => {
  it('serves exactly 16 questions in the fixed slot order', () => {
    for (const pid of PLAYERS) {
      const lu = lineupFor(POOLS, pid, LAUNCH_DAY);
      expect(lu).toHaveLength(16);
      expect(lu.map(x => x.mode)).toEqual(SLOTS);
    }
  });

  it('never shows the same question twice — by id OR by what you see', () => {
    for (const pid of PLAYERS) {
      for (let d = LAUNCH_DAY; d < LAUNCH_DAY + 60; d++) {
        const lu = lineupFor(POOLS, pid, d);
        const ids = lu.map(x => x.item.id);
        const sigs = lu.map(x => signatureOf(x.mode, x.item));
        expect(new Set(ids).size, `${pid} day ${d} duplicate id`).toBe(16);
        expect(new Set(sigs).size, `${pid} day ${d} duplicate item-set`).toBe(16);
      }
    }
  });

  it('shows at most one question per theme', () => {
    for (const pid of PLAYERS) {
      for (let d = LAUNCH_DAY; d < LAUNCH_DAY + 30; d++) {
        const themes = lineupFor(POOLS, pid, d).map(x => x.item.theme);
        expect(new Set(themes).size, `${pid} day ${d}: ${themes.join(',')}`).toBe(16);
      }
    }
  });
});

describe('across days', () => {
  it('uses every question once before repeating any of them', () => {
    const u = uniqueDays(POOLS);
    for (const pid of PLAYERS) {
      const seen = new Map();
      for (let d = LAUNCH_DAY; d < LAUNCH_DAY + u.days; d++)
        for (const { item } of lineupFor(POOLS, pid, d))
          seen.set(item.id, (seen.get(item.id) || 0) + 1);
      const repeated = [...seen.entries()].filter(([, n]) => n > 1);
      expect(repeated.map(r => r[0]), `${pid} repeats within ${u.days} days`).toEqual([]);
    }
  });

  it('is deterministic — the same player and day always get the same set', () => {
    for (let i = 0; i < 20; i++) {
      const a = lineupFor(POOLS, 'alice', LAUNCH_DAY + 3).map(x => x.item.id).join();
      const b = lineupFor(POOLS, 'alice', LAUNCH_DAY + 3).map(x => x.item.id).join();
      expect(a).toBe(b);
    }
  });

  /* INVERTED in QA round 2. This used to assert that two players get DIFFERENT
     sets — the original anti-spoiler design. That design deleted the entire
     reason a daily game spreads: a shared score, a comparable emoji grid, and
     "did you get the whale one?". The pid is now ignored for the daily.
     Full coverage lives in tests/daily-shared.test.js. */
  it('gives EVERY player the same set — the daily is shared', () => {
    const a = lineupFor(POOLS, 'alice', LAUNCH_DAY).map(x => x.item.id);
    const b = lineupFor(POOLS, 'bob', LAUNCH_DAY).map(x => x.item.id);
    expect(a).toEqual(b);
  });

  it('reports how many unique days the bank supports', () => {
    const u = uniqueDays(POOLS);
    // Printed so a drop is visible in CI output, not only when it fails.
    console.log(`    bank supports ${u.days} unique days (thinnest: ${u.thinnest})`);
    expect(u.days).toBeGreaterThanOrEqual(14);
  });
});

describe('India localisation', () => {
  it('can put at least 4 India questions in every set', () => {
    for (const pid of PLAYERS) {
      for (let d = LAUNCH_DAY; d < LAUNCH_DAY + 14; d++) {
        const n = lineupFor(POOLS, pid, d)
          .filter(x => x.item.region === 'india').length;
        expect(n, `${pid} day ${d}`).toBeGreaterThanOrEqual(MIN_INDIA);
      }
    }
  });

  /* The India quota is the one guarantee that silently degrades instead of
     breaking: when the bank runs short the scheduler simply cannot fill it, and
     the last days of the cycle quietly turn into a generic set. It used to go
     4 4 4 ... 4 1 0. Assert the whole cycle, not day one. */
  it('every day of the cycle carries at least MIN_INDIA India questions', () => {
    const low = [];
    for (let d = LAUNCH_DAY; d < LAUNCH_DAY + 16; d++) {
      const n = lineupFor(POOLS, 'quota-check', d).filter(s => s.item.region === 'india').length;
      if (n < MIN_INDIA) low.push(`day +${d - LAUNCH_DAY}: ${n}`);
    }
    expect(low, low.join(', ')).toEqual([]);
  });

  it('the bank holds at least 60 India questions', () => {
    const n = Object.values(POOLS).flat().filter(q => q.region === 'india').length;
    expect(n, `only ${n} India questions`).toBeGreaterThanOrEqual(60);
  });

  /* Two questions whose VISIBLE content is identical are a repeat even though
     their ids differ, and the scheduler cannot see it — it dedupes within a day,
     not within a pool. in-z9 shipped as a byte-for-byte duplicate of in-z2, and
     in-h3 showed the same four pictures as h32. Catch it at the source. */
  it('no two questions in a pool look the same', () => {
    const dups = [];
    for (const [mode, pool] of Object.entries(POOLS)) {
      const by = new Map();
      for (const q of pool) {
        const sig = signatureOf(mode, q);
        if (by.has(sig)) dups.push(`${mode}: ${by.get(sig)} and ${q.id} are identical on screen`);
        else by.set(sig, q.id);
      }
    }
    expect(dups, dups.join('\n')).toEqual([]);
  });

  /* Across a BLOCK BOUNDARY the no-repeat guarantee used to lapse completely: a
     question from the last day of one cycle could reopen the next one two days
     later. The seam repair pushes those out of the opening days.

     This is a budget, not a proof. The swap it needs can be blocked by a theme
     clash or by a day that would drop under its India quota, and roughly one
     question in a thousand still comes back inside six days. The threshold is
     deliberately just above the measured rate so a regression trips it. */
  it('questions do not come back within a week of a cycle boundary', () => {
    let short = 0, total = 0, worst = 99;
    for (let n = 0; n < 12; n++) {
      const seen = new Map();
      for (let d = LAUNCH_DAY; d < LAUNCH_DAY + 40; d++) {
        for (const s of lineupFor(POOLS, 'seam' + n, d)) {
          const sig = s.mode + ':' + signatureOf(s.mode, s.item);
          const prev = seen.get(sig);
          total++;
          if (prev != null) { worst = Math.min(worst, d - prev); if (d - prev < 6) short++; }
          seen.set(sig, d);
        }
      }
    }
    const rate = short / total;
    expect(rate, `${short}/${total} repeats inside 6 days (worst gap ${worst})`).toBeLessThan(0.004);
  });
});
