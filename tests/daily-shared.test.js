import { describe, it, expect } from 'vitest';
import { POOLS } from '../src/modes/index.js';
import { lineupFor, LAUNCH_DAY } from '../src/lib/schedule.js';
import { groups } from '../src/modes/groups.jsx';
import { fingerprint } from '../src/lib/bias.js';

/* QA round 2, P0-1: "Every player gets a DIFFERENT daily set, so the core promise
   breaks." It did — the lineup was seeded with the random per-browser pid. A daily
   game spreads on "did you get the whale one?"; per-player sets delete that, make
   the shared emoji grid meaningless, and made the challenge card's own promise
   ("they get today's exact set") false. */
describe('the daily set is the SAME for everyone', () => {
  const ids = (pid, day) => lineupFor(POOLS, pid, day).map(s => s.item.id);

  it('two different browsers get an identical set on the same day', () => {
    expect(ids('browser-A', LAUNCH_DAY)).toEqual(ids('browser-B', LAUNCH_DAY));
  });

  it('holds for every day of a full cycle, across many pids', () => {
    for (let d = LAUNCH_DAY; d < LAUNCH_DAY + 17; d++) {
      const reference = ids('reference', d);
      for (const pid of ['a', 'b', 'zzz', '', 'pid-with-dashes', '12345'])
        expect(ids(pid, d), `day +${d - LAUNCH_DAY}, pid ${pid}`).toEqual(reference);
    }
  });

  it('a challenge link for day d loads exactly day d, whoever opens it', () => {
    const d = LAUNCH_DAY + 5;
    expect(ids('challenger', d)).toEqual(ids('friend-who-clicked', d));
    expect(ids('friend-who-clicked', d)).not.toEqual(ids('friend-who-clicked', d + 1));
  });

  it('different days still differ — this did not flatten the schedule', () => {
    const seen = new Set();
    for (let d = LAUNCH_DAY; d < LAUNCH_DAY + 17; d++) seen.add(ids('x', d).join(','));
    expect(seen.size).toBe(17);
  });
});

/* P0-2: the instruction says "tap three that belong together", so players tap the
   final auto-locked three. Each tap dissolved the group — two taps re-locked it,
   three unlocked it again — ending with nothing locked and Submit dead. */
describe('Make The Sets — a completed board ignores taps', () => {
  const item = {
    id: 'g-test',
    groups: [
      { label: 'A', items: ['a1', 'a2', 'a3'] },
      { label: 'B', items: ['b1', 'b2', 'b3'] },
      { label: 'C', items: ['c1', 'c2', 'c3'] },
    ],
  };
  const complete = { layout: item.groups.flatMap(g => g.items), picked: [],
                     locked: item.groups.map(g => [...g.items]) };

  it('stays ready after tapping every card once', () => {
    // The scorer only reads `locked`, so a board that is complete must remain so.
    expect(groups.ready(complete)).toBe(true);
    expect(complete.locked.length).toBe(3);
    expect(groups.score(item, complete)).toBe(100);
  });

  it('Reset still clears it', () => {
    const cleared = groups.clear(item);
    expect(cleared.locked).toEqual([]);
    expect(groups.ready(cleared)).toBe(false);
  });
});

/* P0-4: "The Swinger" reads as a sexual term to a 15-24 audience, on a card built
   to be screenshotted into group chats. */
describe('fingerprint names are safe to screenshot', () => {
  const BAD = /\b(swinger|straight|queer|dom|sub|thirst|bang|hard|wet|cherry)\b/i;
  it('no title or blurb carries a slang double meaning', () => {
    const answers = n => Array.from({ length: 16 }, () =>
      ({ mode: 'share', score: 50, signedError: 0, extremity: n }));
    const seen = new Set();
    for (const ex of [0, 0.1, 0.35, 0.5, 0.75, 0.9, 1]) {
      const fp = fingerprint(answers(ex));
      seen.add(fp.title);
      expect(BAD.test(fp.title), `title "${fp.title}"`).toBe(false);
      expect(BAD.test(fp.blurb), `blurb for "${fp.title}"`).toBe(false);
    }
    expect(seen.size).toBeGreaterThan(0);
  });
});
