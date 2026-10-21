/* What does /play mean when you arrive on it?

   Two effects both answered that. The challenge effect called setLineup for the
   challenged day; the route-resolver effect a few lines later said
   `else if (route.name === 'play' && !lineup) startDaily()`. Both run in the
   SAME commit and both read the same `lineup === null` from that render, so the
   resolver always won and a link for day 292 dealt day 293's sixteen — under a
   banner that correctly read "Asha scored 1500 on set #1".

   The banner was right and the questions were wrong, which is why checking the
   banner (what I did last round) proved nothing. The test that matters compares
   the DEALT SET.

   One function decides now, and it is pure so it can be tested without React. */
import { describe, it, expect } from 'vitest';
import { playRouteTarget } from '../src/lib/schedule.js';
import { LAUNCH_DAY } from '../src/lib/schedule.js';

const TODAY = LAUNCH_DAY + 10;
const chal = (day, forToday) => ({ vs: 100, from: 'Asha', day, forToday });

describe('what /play opens', () => {
  it('today’s daily when there is no challenge', () => {
    expect(playRouteTarget(null, TODAY)).toEqual({ kind: 'daily' });
  });

  it('today’s daily for a challenge set today', () => {
    expect(playRouteTarget(chal(TODAY, true), TODAY)).toEqual({ kind: 'daily' });
  });

  it('the CHALLENGED day for a link from an earlier day', () => {
    expect(playRouteTarget(chal(TODAY - 1, false), TODAY)).toEqual({ kind: 'archive', day: TODAY - 1 });
    expect(playRouteTarget(chal(LAUNCH_DAY, false), TODAY)).toEqual({ kind: 'archive', day: LAUNCH_DAY });
  });

  it('an archive run, so a replayable set cannot touch the streak', () => {
    // The kind is load-bearing: bankDay writes streak/best, bankArchive does not.
    expect(playRouteTarget(chal(TODAY - 1, false), TODAY).kind).toBe('archive');
  });

  it('falls back to the daily for a day it cannot honour', () => {
    for (const d of [TODAY + 1, LAUNCH_DAY - 1, NaN, null, undefined, 'x']) {
      expect(playRouteTarget(chal(d, false), TODAY), String(d)).toEqual({ kind: 'daily' });
    }
  });

  it('never returns an archive target for today', () => {
    // Today is the daily; an archive run of it would be a no-stakes preview.
    expect(playRouteTarget(chal(TODAY, false), TODAY)).toEqual({ kind: 'daily' });
  });
});
