/* "Your average 100", shown immediately after scoring 0.

   Reveal's self-comparison reads modeStats(mode, history). GameScreen passed
   `history={banked ? [...answers, justScored] : []}` and `banked` is
   `session.kind === 'daily'` — so in PRACTICE the history was empty and the
   figures came from the banked daily answers alone. Score 0 in Order practice
   with two 100s banked from dailies and the line reads "Your average 100",
   which is not a description of anything the player just did.

   `banked` has a real job in that component — it gates "New best ✨", because
   practice is replayable and a record there is a promise the game breaks on
   reload. It was doing a second job it was never right for. */
import { describe, it, expect } from 'vitest';
import { modeStats } from '../src/lib/stats.js';

const a = (mode, score) => ({ mode, score });

describe('the figures beside an answer describe the run you are in', () => {
  it('counts the answer just given', () => {
    const st = modeStats('order', [a('order', 100), a('order', 0)], false);
    expect(st.n).toBe(2);
    expect(st.mean, 'a 0 must pull the average down').toBe(50);
  });

  it('excludeLast leaves out the answer just given, for "what you had to beat"', () => {
    const prior = modeStats('order', [a('order', 100), a('order', 0)], true);
    expect(prior.n).toBe(1);
    expect(prior.best).toBe(100);
  });

  it('a lone 0 averages 0, not whatever was there before', () => {
    expect(modeStats('order', [a('order', 0)], false).mean).toBe(0);
  });

  it('ignores other modes entirely', () => {
    const st = modeStats('order', [a('order', 0), a('size', 100)], false);
    expect(st.n).toBe(1);
    expect(st.mean).toBe(0);
  });

  it('is null when there is nothing to report', () => {
    expect(modeStats('order', [], false)).toBeNull();
  });

  it('survives junk entries rather than counting them', () => {
    const st = modeStats('order', [a('order', 50), null, undefined, { mode: 'order' }, 'x'], false);
    expect(st.n).toBe(1);
    expect(st.mean).toBe(50);
  });
});
