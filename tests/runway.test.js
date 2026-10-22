/* The bank runs out before it repeats, and nobody finds out from a warning.

   uniqueDays(POOLS).days is 16: draw, Shapes Only and Size each hold 33 global
   questions and spend 2 a day. Launch was day 292 (20 Oct 2026), so the first
   repeat lands on day 308 — 5 Nov — and the archive will show the two days
   side by side.

   The lint already printed the gap, and exited 0. A warning that has been true
   since launch is wallpaper. What matters is not "are we below a number" but
   "how long until a real player is served a question they have already seen" —
   so that is what this gates. A flat `days >= 30` assert would be red today and
   stay red until ~194 questions land, which makes `npm test` useless in the
   meantime; this goes red once the shortage is about to reach players, which is
   when it can still be acted on. MIN_DAYS stays as the never-regress ratchet. */
import { describe, it, expect } from 'vitest';
import { daysUntilRepeat, uniqueDays, LAUNCH_DAY } from '../src/lib/schedule.js';
import { POOLS } from '../src/modes/index.js';

describe('content runway', () => {
  const cycle = uniqueDays(POOLS).days;

  it('reports how many days remain before the first repeat', () => {
    // On launch day itself the whole cycle is ahead.
    expect(daysUntilRepeat(POOLS, LAUNCH_DAY)).toBe(cycle);
    expect(daysUntilRepeat(POOLS, LAUNCH_DAY + 5)).toBe(cycle - 5);
  });

  it('hits zero on the day the first repeat is served', () => {
    expect(daysUntilRepeat(POOLS, LAUNCH_DAY + cycle)).toBe(0);
  });

  it('goes negative once repeats are already happening', () => {
    expect(daysUntilRepeat(POOLS, LAUNCH_DAY + cycle + 3)).toBe(-3);
  });

  it('is never negative before launch', () => {
    expect(daysUntilRepeat(POOLS, LAUNCH_DAY - 10)).toBeGreaterThan(0);
  });

  it('THE GATE: more than 7 days of runway left, or the content job is overdue', () => {
    const left = daysUntilRepeat(POOLS);
    const short = Object.entries(POOLS)
      .map(([m, p]) => [m, 30 * 2 - p.length]).filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1]);
    expect(left, left <= 7
      ? `${left} days until players see a repeated question. ${short.reduce((t, x) => t + x[1], 0)} `
        + `questions short of a 30-day bank: ${short.slice(0, 3).map(([m, n]) => `${m} +${n}`).join(', ')}`
      : '').toBeGreaterThan(7);
  });

  it('the cycle never regresses below the ratchet', () => {
    expect(cycle, 'a pool shrank').toBeGreaterThanOrEqual(16);
  });
});
