/* THE MODE CONTRACT.

   Every game implements this one shape, and nothing outside src/modes needs to know
   which game is playing. That is what makes GameScreen a single component instead of
   an eight-branch switch, and what makes adding a ninth game a new file plus one line.

     init(item)                 -> the starting answer value
     ready(value, item)         -> can the player submit yet?
     score(item, value)         -> 0..100
     Component                  -> ({ item, value, setValue, revealed, crowd })
     clear(item)                -> a fresh value, SAME SHAPE as init(item).
                                   Takes the ITEM, never the current value — one
                                   mode took the value, was handed the item, and
                                   crashed the whole screen.

   Optional, used by the Bias Fingerprint and the crowd reveal:
     signedError(item, value)   -> negative = guessed low, positive = guessed high.
                                   This, not the raw score, is what makes a fingerprint
                                   readable: direction is a personality, size is noise.
     extremity(item, value)     -> 0..1, how far from the safe middle they committed.
                                   ONLY implement it where the player can choose how
                                   far to go — a slider, an axis, a drawn line. A
                                   multiple-choice pick is always a full commitment,
                                   so returning a constant measures the MODE, not the
                                   player, and averaging it put a 0.45 floor under the
                                   metric that made the Fence-Sitter unreachable.
                                   Pinned by tests/bias.test.js.
     numeric(item, value)       -> { truth, guess } for the crowd distribution.
                                   Omit when the question has no number line
                                   (odd-one-out, groups) and the reveal falls back
                                   to a simple "x% of players got this" bar.
     magnitude(item)            -> 'world' tags questions about the state of the world,
                                   which the Doom-Optimist test reads separately.          */

export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** Shared scoring curve for "how close in orders of magnitude" modes.
 *  NO tolerance band: the score falls from the first fraction off, so 100 means
 *  exact. An earlier version granted a flat 100 anywhere within a factor of 1.20,
 *  which made "Uncanny" meaningless and was visible to players immediately.
 *
 *  zero = the log10 distance that scores nothing. 1.15 ≈ a factor of 14, which for a
 *  slider spanning 0.05x-200x leaves a 10x miss worth ~13 rather than a blunt zero. */
export function logScore(guess, truth, { free = 0.021, zero = 0.602, power = 2.2 } = {}) {
  if (!(guess > 0) || !(truth > 0)) return 0;
  const e = Math.abs(Math.log10(guess / truth));
  // Calibrated against stated targets: 100 inside ±5%, ~50 at 1.5x out, ~20 at 2x
  // out, 0 at 4x out. The linear version was far too flat — a 2x miss still scored
  // 74, which is why "Very close" kept appearing next to obviously wrong answers.
  // `free` is 5% expressed in log10, not a tolerance plateau: beyond it the curve
  // falls immediately and steeply.
  const t = clamp(1 - (e - free) / (zero - free), 0, 1);
  return clamp(Math.round(100 * Math.pow(t, power)), 0, 100);
}
