import { describe, it, expect } from 'vitest';
import { puzzleNumber, puzzleLabel, LAUNCH_DAY, dayNumber } from '../src/lib/schedule.js';

/* QA: "Today's share text says Squiggle #289, so launch day will be #292.
   Players expect launch day to be #1." */
describe('puzzle numbering', () => {
  it('launch day is #1', () => {
    expect(puzzleNumber(LAUNCH_DAY)).toBe(1);
    expect(puzzleLabel(LAUNCH_DAY)).toBe('#1');
  });

  it('counts up one per day after launch', () => {
    expect(puzzleNumber(LAUNCH_DAY + 1)).toBe(2);
    expect(puzzleLabel(LAUNCH_DAY + 29)).toBe('#30');
  });

  it('never shows a zero or negative number before launch', () => {
    for (let d = LAUNCH_DAY - 10; d < LAUNCH_DAY; d++) {
      expect(puzzleNumber(d)).toBeLessThanOrEqual(0);
      expect(puzzleLabel(d)).toBe('Preview');
    }
  });

  it('the internal day index is unchanged — storage keys keep working', () => {
    expect(dayNumber(new Date(2026, 0, 1))).toBe(0);
    expect(LAUNCH_DAY).toBe(dayNumber(new Date(2026, 9, 20)));
  });
});
