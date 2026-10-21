/* Where does a half-finished run pick up again?

   The run is saved after every answer, so a refresh resumes it. The position was
   restored with Math.min(flight.idx, SLOTS.length - 1). After the sixteenth
   answer the stored idx IS 16, so that clamp produced 15 — question sixteen,
   with its answer already on screen. Answering it again appended a SEVENTEENTH
   score, which bankDay then summed: a day could bank 17 answers and a total
   above the 1600 maximum. Practice restored the same way and had the same bug.

   The deeper fault is that the position was stored as a second copy of a fact
   the answers array already holds. Two copies of one fact drift. Derive it. */
import { describe, it, expect } from 'vitest';
import { resumePoint, mergeInflight } from '../src/lib/storage.js';

const answers = n => Array.from({ length: n }, (_, i) => ({ mode: 'm', score: 100, i }));

describe('resuming a saved run', () => {
  it('resumes at the next unanswered question', () => {
    expect(resumePoint(answers(7), 16)).toMatchObject({ done: false, idx: 7 });
  });

  it('starts at the beginning when nothing is answered', () => {
    expect(resumePoint([], 16)).toMatchObject({ done: false, idx: 0 });
  });

  it('a fully answered run is DONE, not parked on the last question', () => {
    const r = resumePoint(answers(16), 16);
    /* `done` is the whole contract: the caller routes to results and never
       renders a question, so idx is not read. Asserting a particular idx here
       would be testing the implementation rather than the invariant — the
       invariant is that a finished run is never offered a question again. */
    expect(r.done, 'a finished run must route to results, never re-open Q16').toBe(true);
    expect(r.answers).toHaveLength(16);
  });

  it('an unfinished run never points at a question already answered', () => {
    for (let n = 0; n < 16; n++) {
      const r = resumePoint(answers(n), 16);
      expect(r.done).toBe(false);
      expect(r.idx, `${n} answered`).toBe(n);          // the next one, never a repeat
      expect(r.idx).toBeLessThan(16);
    }
  });

  it('never returns more answers than the run has questions', () => {
    // The old path could already have banked 17; a restore must not carry it.
    expect(resumePoint(answers(17), 16).answers).toHaveLength(16);
    expect(resumePoint(answers(99), 16).answers).toHaveLength(16);
  });

  it('a corrupt answers value resumes from the start instead of throwing', () => {
    for (const junk of [null, undefined, 'nope', 42, {}, NaN]) {
      expect(() => resumePoint(junk, 16), String(junk)).not.toThrow();
      expect(resumePoint(junk, 16), String(junk)).toMatchObject({ done: false, idx: 0 });
      expect(Array.isArray(resumePoint(junk, 16).answers)).toBe(true);
    }
  });

  it('the stored position always equals the number of answers', () => {
    // mergeInflight is the only writer; if these two ever disagree the clamp
    // bug comes back in a new shape.
    for (const n of [0, 1, 7, 15, 16]) {
      expect(mergeInflight(null, answers(n), 5).idx).toBe(n);
    }
  });

  it('a finished run restored from storage is still DONE', () => {
    const stored = mergeInflight(null, answers(16), 5);
    expect(resumePoint(stored.answers, 16).done).toBe(true);
  });
});
