/* Streak arithmetic, in one place.

   It lived in two: bankDay() granted one free missed day a week ("insurance"),
   and the home screen decided separately that a streak was alive only if you
   had played today or yesterday. So a player who missed one day was told
   "Streak lost" on the home screen and then had it silently continued when they
   played. The screen contradicted the rule.

   bankDay also reset the streak to 1 whenever the gap was not 1 or 2 — which
   includes a gap of ZERO OR LESS. Fly west across the dateline, or let a device
   clock go back, and the day number drops below lastDay: the streak was wiped
   for playing on a day that had already happened. */
import { describe, it, expect } from 'vitest';
import { streakAfter, streakIsAlive, weekNumber } from '../src/lib/schedule.js';

const DAY = 300;
const st = (streak, lastDay, insuranceWeek = null) => ({ streak, lastDay, insuranceWeek });

describe('what banking a day does to a streak', () => {
  it('a first ever play starts the streak at one', () => {
    expect(streakAfter({}, DAY)).toMatchObject({ streak: 1, lastDay: DAY });
  });

  it('playing the next day continues it', () => {
    expect(streakAfter(st(4, DAY - 1), DAY)).toMatchObject({ streak: 5, lastDay: DAY });
  });

  it('one missed day is covered by insurance, once a week', () => {
    const after = streakAfter(st(4, DAY - 2), DAY);
    expect(after.streak).toBe(5);
    expect(after.insuranceWeek, 'the week must be recorded or it is free every day').toBe(weekNumber(DAY));
  });

  it('insurance does not pay twice in the same week', () => {
    const used = st(4, DAY - 2, weekNumber(DAY));
    expect(streakAfter(used, DAY).streak).toBe(1);
  });

  it('two missed days breaks it', () => {
    expect(streakAfter(st(9, DAY - 3), DAY).streak).toBe(1);
  });

  it('a day that has already happened changes nothing', () => {
    // Flying west over the dateline, or a clock going back. The streak and
    // lastDay must BOTH hold: moving lastDay backwards would break tomorrow too.
    for (const gap of [0, -1, -5]) {
      const before = st(7, DAY - gap, 12);
      expect(streakAfter(before, DAY), `gap ${gap}`).toEqual(before);
    }
  });
});

describe('what the home screen says about the streak', () => {
  it('agrees with banking, on every gap and every streak length', () => {
    /* The real invariant: the screen must never say "lost" about a streak that
       playing today would keep, nor show one that playing would reset.
       Streak length is swept too — at 6 only, this passed a definition that
       called a day-one player who had already played today "lost". */
    for (let gap = 0; gap <= 5; gap++) {
      for (const insured of [null, weekNumber(DAY)]) {
        for (const had of [1, 2, 6]) {
          const before = st(had, DAY - gap, insured);
          const lost = streakAfter(before, DAY).streak === 1 && had > 1;
          expect(streakIsAlive(before, DAY), `streak ${had}, gap ${gap}, insuranceWeek ${insured}`).toBe(!lost);
        }
      }
    }
  });

  it('a player who played today still has their streak, even at one', () => {
    expect(streakIsAlive(st(1, DAY), DAY)).toBe(true);
    expect(streakIsAlive(st(1, DAY - 1), DAY)).toBe(true);
  });

  it('a player who has never played has no streak', () => {
    expect(streakIsAlive({}, DAY)).toBe(false);
    expect(streakIsAlive({ lastDay: null, streak: 0 }, DAY)).toBe(false);
  });

  it('survives a corrupt saved state instead of throwing', () => {
    for (const junk of [null, undefined, 'x', 42, { lastDay: 'yesterday' }]) {
      expect(() => streakIsAlive(junk, DAY), String(junk)).not.toThrow();
      expect(streakIsAlive(junk, DAY), String(junk)).toBe(false);
    }
  });
});
