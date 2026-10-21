/* A challenge link has to compare two scores on the SAME questions.

   challengeLink() wrote the day — `/play?vs=1291&d=290&from=Asha` — and the
   reader never looked at it. Open a two-day-old link and the game put Asha's
   290 score against your 293 set, over the line "Asha scored 1291 on today's
   set." Different sixteen questions, different difficulty, and a sentence that
   is simply false. The Privacy page meanwhile told players the link carries the
   day number, which it did, unused.

   The writer and the reader are tested together here, because the bug was
   precisely that they disagreed about the format. */
import { describe, it, expect } from 'vitest';
import { challengeLink, parseChallenge } from '../src/lib/sharecard.js';
import { SLOTS, LAUNCH_DAY } from '../src/lib/schedule.js';

const TODAY = LAUNCH_DAY + 10;
const search = url => new URL(url).search;
const round = (name, total, day, today = TODAY) =>
  parseChallenge(search(challengeLink(name, total, day, 'https://sq.test')), today);

describe('challenge links', () => {
  it('round-trips everything it writes', () => {
    expect(round('Asha', 1291, TODAY)).toMatchObject({ vs: 1291, from: 'Asha', day: TODAY });
  });

  it('knows a link made for today', () => {
    expect(round('Asha', 1200, TODAY).forToday).toBe(true);
  });

  it('keeps the day a past link was made for, and does not call it today', () => {
    const c = round('Asha', 1200, TODAY - 3);
    expect(c.day).toBe(TODAY - 3);
    expect(c.forToday).toBe(false);
  });

  it('rejects a link for a day that has not happened', () => {
    expect(round('Asha', 1200, TODAY + 1)).toBeNull();
  });

  it('rejects a link for a day before the game existed', () => {
    expect(round('Asha', 1200, LAUNCH_DAY - 1)).toBeNull();
  });

  it('rejects a score that could not have been scored', () => {
    expect(parseChallenge(`?vs=${SLOTS.length * 100 + 1}&d=${TODAY}`, TODAY)).toBeNull();
    expect(parseChallenge(`?vs=-1&d=${TODAY}`, TODAY)).toBeNull();
    expect(parseChallenge(`?vs=notanumber&d=${TODAY}`, TODAY)).toBeNull();
    expect(parseChallenge('?from=Asha', TODAY)).toBeNull();
  });

  it('accepts the maximum possible score', () => {
    expect(parseChallenge(`?vs=${SLOTS.length * 100}&d=${TODAY}`, TODAY)?.vs).toBe(SLOTS.length * 100);
  });

  it('still works for an old link with no day on it', () => {
    // Links already in the wild predate the `d` param; treat them as today's,
    // which is what the game did before and is the only guess available.
    const c = parseChallenge('?vs=900&from=Asha', TODAY);
    expect(c).toMatchObject({ vs: 900, forToday: true });
    expect(c.day).toBe(TODAY);
  });

  it('truncates a long name rather than carrying it whole', () => {
    expect(round('x'.repeat(100), 900, TODAY).from).toHaveLength(24);
  });

  it('survives junk in the query string', () => {
    for (const q of ['', '?', '?vs=', '?d=abc&vs=5', '?vs=5&d=']) {
      expect(() => parseChallenge(q, TODAY), q).not.toThrow();
    }
  });
});
