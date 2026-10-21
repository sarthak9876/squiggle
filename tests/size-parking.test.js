/* You should not be able to score by not playing.

   Size It Up maps the slider onto a per-question range, and the position of the
   truth within that range (`at`) was drawn from two bands either side of the
   middle. The bands avoid the middle but their MEAN is the middle, so dragging
   to v≈415 on every question averaged 55.1 out of 100 and beat 50 on 16 of the
   33 questions — against 32.7 for a uniformly random guess.

   Note what is NOT achievable. The best fixed position can never average less
   than the average over ALL positions, and that average IS the random score —
   so "no position above 30" asks the maximum to fall below its own mean. The
   honest target is that parking stays close to guessing, and the GAP between
   those two numbers is what this test watches.

   Measured with the real scorer over the whole bank:

     bands                        best parked   random   gap   start
     [0.20,0.46] u [0.54,0.80]    55.1 (v=415)   32.7    22.4    8.4
     [0.08,0.46] u [0.54,0.92]    46.0 (v=370)   31.8    14.2   13.4

   The trade is deliberate: the farmable score drops nine points, and the score
   a lazy player actually reaches — nudge once to satisfy `ready`, submit —
   rises five and stays far below anything worth having.

   Two earlier attempts at tuning this used hand-rolled harnesses with an
   approximated scorer and produced 43.9 and 92.8, both wrong. The numbers above
   come from this file's own sweep against size.score. */
import { describe, it, expect } from 'vitest';
import { size } from '../src/modes/size.jsx';
import { POOLS } from '../src/modes/index.js';

const bank = POOLS.size;
const meanAt = v => bank.reduce((a, q) => a + size.score(q, { v }), 0) / bank.length;

describe('Size It Up cannot be farmed from one slider position', () => {
  const sweep = [];
  for (let v = 0; v <= 1000; v += 5) sweep.push([v, meanAt(v)]);
  const random = sweep.reduce((a, r) => a + r[1], 0) / sweep.length;
  const [bestV, best] = sweep.reduce((a, b) => (b[1] > a[1] ? b : a));

  it('no single position averages much better than guessing', () => {
    // 55.1 before the bands were widened, 46.0 after.
    expect(best, `v=${bestV} averages ${best.toFixed(1)} against ${random.toFixed(1)} for random`)
      .toBeLessThan(48);
  });

  it('the best parked position is within 16 points of random', () => {
    expect(best - random, `best ${best.toFixed(1)}, random ${random.toFixed(1)}`).toBeLessThan(16);
  });

  it('NO question scores at the position it starts on', () => {
    /* Per question, not on average. Widening the bands moved the bank mean to
       13.4 — comfortably "fine" — while z12 quietly started on 61. A mean hides
       exactly the outlier this is looking for. This is the Order Reset lesson,
       and it is the door that needs no intent at all: nudge once to satisfy
       `ready`, submit. */
    const scored = bank.map(q => [q.id, size.score(q, size.init(q))]).filter(([, s]) => s > 10);
    expect(scored, scored.map(([id, s]) => `${id} starts on ${s}`).join(', ')).toEqual([]);
  });

  it('the start is always far from the truth, on every question', () => {
    // The guarantee behind the test above, stated directly so a future change
    // to the bands cannot quietly erode it.
    for (const q of bank) {
      const best = [...Array(201)].map((_, i) => [i * 5, size.score(q, { v: i * 5 })])
        .reduce((a, b) => (b[1] > a[1] ? b : a))[0];
      expect(Math.abs(size.init(q).v - best) / 1000, `${q.id}`).toBeGreaterThan(0.4);
    }
  });

  it('Reset returns to the start, and so scores nothing either', () => {
    const scored = bank.map(q => [q.id, size.score(q, size.clear(q))]).filter(([, s]) => s > 10);
    expect(scored, scored.map(([id, s]) => `${id} scores ${s} after Reset`).join(', ')).toEqual([]);
    expect(bank.every(q => size.clear(q).v === size.init(q).v)).toBe(true);
  });

  it('an untouched slider cannot be submitted at all', () => {
    expect(bank.every(q => !size.ready(size.init(q)))).toBe(true);
    expect(bank.every(q => !size.ready(size.clear(q)))).toBe(true);
  });

  it('the truth is always reachable, and never pinned to an end', () => {
    for (const q of bank) {
      const scores = [];
      for (let v = 0; v <= 1000; v += 2) scores.push(size.score(q, { v }));
      expect(Math.max(...scores), `${q.id} has no winning position`).toBeGreaterThanOrEqual(95);
    }
  });
});
