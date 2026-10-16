/* Crowd data — the interface, with mock numbers behind it.

   Every component calls getCrowd() and never knows whether the answer came from a
   server or from this file. Swapping in a real API is ONE function body; nothing
   that renders a distribution has to change.

   The mock is deterministic per question (seeded off the id) so a reload shows the
   same crowd, and it is deliberately BIASED rather than centred on the truth —
   real crowds are systematically wrong, which is the entire premise of this game. */
import { hash, rng } from './random.js';

/** @typedef {{ n:number, p10:number, p50:number, p90:number,
 *              histogram:number[], share:number, beat:number }} Crowd */

const CACHE = new Map();

/**
 * @param {string} questionId
 * @param {number} truth      the correct value, in whatever unit the mode uses
 * @param {number} [playerVal] the player's answer, to compute "you beat N%"
 * @returns {Promise<Crowd>}
 */
export async function getCrowd(questionId, truth, playerVal) {
  const key = questionId + ':' + truth;
  if (!CACHE.has(key)) CACHE.set(key, synth(questionId, truth));
  const base = CACHE.get(key);
  // "You beat X% of players" is computed against the mock sample, so it moves
  // sensibly with the player's answer even while the data is fake.
  let beat = 50;
  if (playerVal != null && base.samples.length) {
    const myErr = Math.abs(playerVal - truth);
    beat = Math.round(100 * base.samples.filter(s => Math.abs(s - truth) > myErr).length / base.samples.length);
  }
  return { ...base, beat };
}

function synth(id, truth) {
  const r = rng(hash(id));
  const n = 900 + Math.floor(r() * 2600);
  // A systematic lean, not noise: crowds under-estimate big things and
  // over-estimate small ones. Signed so some questions skew each way.
  const lean = (r() - 0.45) * 0.55;
  const spread = 0.22 + r() * 0.3;
  const samples = [];
  for (let i = 0; i < 400; i++) {
    // Sum of three uniforms ≈ normal, without pulling in a stats library.
    const g = (r() + r() + r()) / 3 - 0.5;
    samples.push(truth * (1 + lean + g * spread * 2));
  }
  samples.sort((a, b) => a - b);
  const at = q => samples[Math.floor(q * (samples.length - 1))];
  const lo = at(0.02), hi = at(0.98), span = (hi - lo) || 1;
  const bins = 14, histogram = new Array(bins).fill(0);
  for (const s of samples) {
    const b = Math.min(bins - 1, Math.max(0, Math.floor(((s - lo) / span) * bins)));
    histogram[b]++;
  }
  const peak = Math.max(...histogram, 1);
  return {
    n, samples, lo, hi,
    p10: at(0.10), p50: at(0.50), p90: at(0.90),
    histogram: histogram.map(h => h / peak),
    share: Math.round(100 * samples.filter(s => Math.abs(s - truth) < truth * 0.15).length / samples.length),
  };
}
