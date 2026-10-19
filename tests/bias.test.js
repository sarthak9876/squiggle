import { describe, it, expect } from 'vitest';
import { MODES } from '../src/modes/index.js';
import { SLOTS } from '../src/lib/schedule.js';
import { fingerprint } from '../src/lib/bias.js';

/* The Fence-Sitter bug: six of eight modes reported a CONSTANT extremity
   (groups/shadow/odd = 1, order = 0.6). Averaged over a 16-slot day that put a
   floor of 0.450 under the metric, so the hedger test (< 0.3) could never fire —
   and because the fallback was `|| TYPES[3]`, "You park near the middle and hope"
   became the default verdict on every ordinary run. */

const REPORTS = ['draw', 'place', 'share', 'size'];

/** A full day where every extremity-reporting slot commits by `ex`. */
const day = (ex, over = {}) => SLOTS.map(m => ({
  mode: m, score: 55, signedError: 0,
  ...(REPORTS.includes(m) ? { extremity: ex } : {}),
  ...over,
}));

describe('extremity measures the player, not the mode', () => {
  it('only the continuous modes report it', () => {
    // A multiple-choice pick is always a full commitment, so a constant here is
    // a fact about the MODE. Adding extremity to a discrete mode re-floors the
    // metric and kills the Fence-Sitter reading — that is why this is pinned.
    const actual = Object.keys(MODES).filter(m => typeof MODES[m].extremity === 'function');
    expect(actual.sort()).toEqual([...REPORTS].sort());
  });

  it('a player who parks in the middle IS read as a fence-sitter', () => {
    expect(fingerprint(day(0)).id).toBe('hedger');
  });

  it('a player who commits hard IS read as a risk-taker', () => {
    expect(fingerprint(day(1)).id).toBe('gambler');
  });

  it('an ordinary player is never handed the fence-sitter verdict', () => {
    for (const ex of [0.4, 0.5, 0.6, 0.7]) {
      const fp = fingerprint(day(ex));
      expect(fp.id, `extremity ${ex}`).not.toBe('hedger');
    }
  });
});

describe('the fallback is a real type, not a judgement', () => {
  it('a run with no extremity data is not labelled a fence-sitter', () => {
    // `null < 0.3` is true in JS, so an unguarded compare would label everyone.
    const discrete = SLOTS.filter(m => !REPORTS.includes(m))
      .map(m => ({ mode: m, score: 55, signedError: 0 }));
    expect(fingerprint(discrete).id).toBe('mixed');
  });

  it('every type a finished run can produce carries a title and a blurb', () => {
    for (const ex of [0, 0.25, 0.5, 0.75, 1]) {
      const fp = fingerprint(day(ex));
      expect(fp.title, `extremity ${ex}`).toBeTruthy();
      expect(fp.blurb, `extremity ${ex}`).toBeTruthy();
    }
  });
});
