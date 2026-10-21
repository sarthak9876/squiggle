/* The archive must not hand you today's set.

   It listed `today` as its first tile, and the route guard allowed d === day.
   Archive runs are replayable and never count towards the streak — that is the
   point of them — so a player could open today in the archive, see all sixteen
   answers, then play the daily knowing every one. The streak, the best score
   and the shared card all become meaningless, and nothing about it looks like
   cheating: it is two taps on the home screen.

   The comment above the loop said "future days are never listed, so the archive
   can never leak tomorrow's set". It was guarding the wrong end. */
import { describe, it, expect } from 'vitest';
import { isArchiveDay, archiveDays, LAUNCH_DAY } from '../src/lib/schedule.js';

const TODAY = LAUNCH_DAY + 10;

describe('which days the archive may offer', () => {
  it('never today — that is the daily, and the daily is one attempt', () => {
    expect(isArchiveDay(TODAY, TODAY)).toBe(false);
  });

  it('never the future', () => {
    expect(isArchiveDay(TODAY + 1, TODAY)).toBe(false);
    expect(isArchiveDay(TODAY + 500, TODAY)).toBe(false);
  });

  it('never before the game existed', () => {
    expect(isArchiveDay(LAUNCH_DAY - 1, TODAY)).toBe(false);
    expect(isArchiveDay(0, TODAY)).toBe(false);
  });

  it('yesterday back to launch day, inclusive', () => {
    expect(isArchiveDay(TODAY - 1, TODAY)).toBe(true);
    expect(isArchiveDay(LAUNCH_DAY, TODAY)).toBe(true);
  });

  it('the listed days are exactly the playable ones, newest first', () => {
    const days = archiveDays(TODAY);
    expect(days[0]).toBe(TODAY - 1);
    expect(days.at(-1)).toBe(LAUNCH_DAY);
    expect(days).not.toContain(TODAY);
    expect(days.every(d => isArchiveDay(d, TODAY))).toBe(true);
    expect(days).toHaveLength(TODAY - LAUNCH_DAY);
  });

  it('is empty on launch day itself, when there is no past yet', () => {
    expect(archiveDays(LAUNCH_DAY)).toEqual([]);
  });

  it('holds exactly one day the day after launch', () => {
    // The empty-state copy keys off this length; an off-by-one there told a
    // player with one playable day that there was nothing here yet.
    expect(archiveDays(LAUNCH_DAY + 1)).toEqual([LAUNCH_DAY]);
  });

  it('rejects junk rather than listing it', () => {
    for (const junk of [NaN, undefined, null, 'x']) {
      expect(isArchiveDay(junk, TODAY), String(junk)).toBe(false);
    }
  });
});
