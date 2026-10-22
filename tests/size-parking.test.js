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
import { size, toRatio } from '../src/modes/size.jsx';
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
    /* The bar is RANDOM, not zero. Making the start drawable (above) moves it
       closer to the truth on a high-ratio question, because the range is narrow
       and sits high — there is no position that is both far from a 15.5x answer
       and inside the stage. Drawability wins that trade: a picture the player
       cannot see breaks the game, while `ready: touched` already stops anyone
       submitting the start without moving. What must not happen is a start
       worth MORE than guessing, which averages ~32.

       z12 is exempt and should not be. Sun vs Earth is 109x: it cannot be drawn
       to scale at any position (it carries the "too big to draw to scale"
       badge) and its range is so high that every start sits near the answer, so
       it begins on 49. Both faults are the same cause and neither is fixable in
       code — the question does not work in this mechanic. Flagged for removal;
       left in because dropping content is the owner's call, and size would go
       33 -> 32, which still floors at 16 days. */
    const KNOWN_BAD = { z12: 'truth 109x — undrawable at every position, see note above' };
    const scored = bank.map(q => [q.id, size.score(q, size.init(q))])
      .filter(([id, s]) => s > 35 && !(id in KNOWN_BAD));
    expect(scored, scored.map(([id, s]) => `${id} starts on ${s}, above the ~32 a random guess scores`).join(', ')).toEqual([]);
    expect(Object.keys(KNOWN_BAD).every(id => bank.some(q => q.id === id)),
      'a KNOWN_BAD id no longer exists — drop it from the list').toBe(true);
  });

  it('the bank-wide start score stays far below a random guess', () => {
    // Per-question allows one bad outlier; the mean is what a real player meets.
    const mean = bank.reduce((a, q) => a + size.score(q, size.init(q)), 0) / bank.length;
    expect(mean, `mean start score ${mean.toFixed(1)}`).toBeLessThan(12);
  });

  it('the start position is one the stage can actually DRAW', () => {
    /* Regression, found by the e2e matrix only once the daily rotated to z29
       ("how big is a PLANE compared to a car?", truth 15.5x). startV puts the
       slider as far from the truth as it can; for a high-ratio question that
       meant 102x, which pins the reference box on the 4px FLOOR and renders
       its artwork at ZERO SIZE — "q2 (Size It Up) rendered 1 piece(s) of
       artwork at zero size".

       Measured in Chrome: with the target box at its 139px maximum the
       reference is 139/ratio, so 102x gives 4px and 6.1x gives 22.9px. Past
       about 10x there is no room for a picture. Being far from the truth is
       worth nothing if the player cannot see what they are comparing. */
    const DRAWABLE = 10;
    const bad = [];
    for (const q of bank) {
      /* Seven questions have a TRUTH the stage cannot draw either (z12 at 109x,
         z9 at 28x, ...). Those show "too big to draw to scale" at every slider
         position including the answer — a disclosed state, not a surprise, and
         no start position inside their range can be drawable. Exempt them here
         and judge them on that badge instead. */
      if (q.answer > DRAWABLE || q.answer < 1 / DRAWABLE) continue;
      const r = toRatio(size.init(q).v, q);
      if (r > DRAWABLE || r < 1 / DRAWABLE) bad.push(`${q.id} starts at ${r.toFixed(2)}x`);
    }
    expect(bad, bad.join(', ')).toEqual([]);
  });

  /* A "distance from the winning position" check used to live here, asserting
     the start sat >40% of the travel away. It was a PROXY for "the start does
     not score", and once drawability constrained the start it began failing on
     questions that score 11 — a true statement about distance and a false alarm
     about the thing anyone cares about. The score tests above are the invariant
     itself, so the proxy is gone rather than re-thresholded. */

  it('Reset returns to the start, and so scores nothing either', () => {
    // Reset IS the start, so it inherits exactly the bar above.
    const scored = bank.map(q => [q.id, size.score(q, size.clear(q))])
      .filter(([id, s]) => s > 35 && id !== 'z12');
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
