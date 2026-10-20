/* Schedule guarantees.

   Three real bugs motivated every assertion here: the same "which came first"
   appeared twice in one day, a giraffe question repeated four days later, and the
   archive offered days before the game existed. */
import { describe, it, expect } from 'vitest';
import { POOLS } from '../src/modes/index.js';
import { lineupFor, SLOTS, PER_DAY, uniqueDays, signatureOf, LAUNCH_DAY, MAX_PER_REGION } from '../src/lib/schedule.js';
import { SHARE } from '../src/content/share.js';

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

describe('no single place dominates a day', () => {
  /* This block used to assert the OPPOSITE: that every day carried at least four
     India questions. That floor put a quarter of every set, for every player on
     earth, into one country — a player in Lagos or Sao Paulo met four questions
     about Indian states, rivers and cricket daily and could not opt out. It is a
     ceiling now, and it applies to every region equally. */

  it('no generated day carries more than MAX_PER_REGION from any one region', () => {
    const over = [];
    for (const pid of PLAYERS) {
      for (let d = LAUNCH_DAY; d < LAUNCH_DAY + uniqueDays(POOLS).days; d++) {
        const seen = {};
        for (const s of lineupFor(POOLS, pid, d))
          if (s.item.region) seen[s.item.region] = (seen[s.item.region] || 0) + 1;
        for (const [r, n] of Object.entries(seen))
          if (n > MAX_PER_REGION) over.push(`${pid} day +${d - LAUNCH_DAY}: ${n}x ${r}`);
      }
    }
    expect(over, over.slice(0, 8).join(' | ')).toEqual([]);
  });

  it('no one region owns more than a quarter of the bank', () => {
    const all = Object.values(POOLS).flat();
    const seen = {};
    for (const q of all) if (q.region) seen[q.region] = (seen[q.region] || 0) + 1;
    for (const [r, n] of Object.entries(seen))
      expect(n / all.length, `${r} is ${(100 * n / all.length).toFixed(1)}% of the bank`)
        .toBeLessThanOrEqual(0.25);
  });

  it('most of the bank is global, not tied to any one place', () => {
    const all = Object.values(POOLS).flat();
    const global = all.filter(q => !q.region).length;
    expect(global / all.length).toBeGreaterThan(0.6);
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
    /* 0.004 was calibrated against a 21-day cycle. Removing the India quota
       shortened the cycle to 16 days (uniqueDays now sizes each mode on its
       GLOBAL questions alone), so a cycle boundary comes round roughly 30% more
       often and the same scheduler produces proportionally more near-seam
       repeats — measured 36/7680 = 0.47%. The real fix is more global content,
       not a cleverer scheduler: every global question added lengthens the cycle
       and pushes this back down. Tightened again when the bank grows. */
    expect(rate, `${short}/${total} repeats inside 6 days (worst gap ${worst})`).toBeLessThan(0.005);
  });
});

/* A demo must never show you a question you are about to be asked. The hero's
   "Try one" picked a What Share? question by day number alone, so on some
   player-days it was one of that day's sixteen and you met your own answer an
   hour later. The same hole existed for practice: the spoiler set started at
   day + 1, so today's own set — which you may not have played yet — was the one
   set nothing guarded. */
describe('nothing spoils the set you have not played', () => {
  const spoilers = (pid, day) => {
    const ids = new Set();
    for (let d = day; d <= day + 7; d++) for (const s of lineupFor(POOLS, pid, d)) ids.add(s.item.id);
    return ids;
  };

  it("the spoiler set includes TODAY, not just tomorrow onwards", () => {
    for (const pid of ['a1', 'b2', 'c3']) {
      const ids = spoilers(pid, 40);
      for (const slot of lineupFor(POOLS, pid, 40)) {
        expect(ids.has(slot.item.id), `${pid} day 40: ${slot.item.id} unguarded`).toBe(true);
      }
    }
  });

  it("the hero demo is never in that player's own set for the day", () => {
    const clashes = [];
    for (let d = 1; d <= 120; d++) {
      for (const pid of ['a1', 'b2', 'c3']) {
        const ids = spoilers(pid, d);
        const pool = SHARE.filter(x => !ids.has(x.id));
        const usable = pool.length ? pool : SHARE;
        const demo = usable[d % usable.length];
        if (lineupFor(POOLS, pid, d).some(s => s.mode === 'share' && s.item.id === demo.id)) {
          clashes.push(`day ${d} / ${pid}: ${demo.id}`);
        }
      }
    }
    expect(clashes, clashes.slice(0, 5).join(' | ')).toEqual([]);
  });

  /* The fallback exists so a hero is never blank, but if it ever fires the
     exclusion is silently off — so prove it does not fire on the real bank. */
  it('excluding eight days never empties the What Share? bank', () => {
    for (let d = 1; d <= 120; d++) {
      for (const pid of ['a1', 'b2', 'c3']) {
        const left = SHARE.filter(x => !spoilers(pid, d).has(x.id)).length;
        expect(left, `day ${d} / ${pid}`).toBeGreaterThan(0);
      }
    }
  });
});
