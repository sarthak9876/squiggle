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
import { resumePoint, mergeInflight, inflightResume } from '../src/lib/storage.js';

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

/* The home button's label came from `inflight.idx` while the resume itself came
   from resumePoint(answers). Two readings of one fact, so they disagreed:

     16 answers saved   label "Continue from 16 of 16", and the tap went
                        straight to the results — there was nothing to continue
     corrupt answers    label "Continue from 3 of 16", and the tap restarted at
                        question 1, because resumePoint rejects junk

   Same drift the resume bug itself was, one component over. The label must be
   derived from the same call that decides where the tap lands. */
describe('what the home button should say', () => {
  const label = (answers, total = 16) => {
    const at = resumePoint(answers, total);
    return at.done ? "See today's result"
         : at.idx > 0 ? `Continue from ${at.idx} of ${total}`
         : "Play today's 16";
  };

  it('offers to continue from where you actually are', () => {
    expect(label(answers(7))).toBe('Continue from 7 of 16');
  });

  it('a finished run offers the RESULT, not a continue', () => {
    expect(label(answers(16))).toBe("See today's result");
    expect(label(answers(16))).not.toMatch(/Continue/);
  });

  it('a corrupt save offers a fresh start, not a phantom position', () => {
    for (const junk of ['nope', 42, null, { idx: 3 }]) {
      expect(label(junk), String(junk)).toBe("Play today's 16");
    }
  });

  it('nothing saved offers a fresh start', () => {
    expect(label([])).toBe("Play today's 16");
  });

  it('the label never names a position the tap will not open', () => {
    // The invariant behind all of the above.
    for (const n of [0, 1, 7, 15, 16, 17]) {
      const at = resumePoint(answers(n), 16);
      const m = label(answers(n)).match(/Continue from (\d+)/);
      if (m) expect(Number(m[1]), `${n} answered`).toBe(at.idx);
      else expect(at.done || at.idx === 0, `${n} answered`).toBe(true);
    }
  });
});

/* The gate itself was still written twice.

   After the label fix, BOTH the home label and the tap went through
   resumePoint — real progress — but each re-derived "is there an inflight run
   for today?" in its own expression, with its own total (SLOTS.length in one,
   lineup.length in the other). The VALUE was shared; the lookup around it was
   not. That is the same two-sources-of-truth shape one layer up, and it is the
   shape that produced the original bug. One function owns the whole fact. */
describe('finding today’s saved run', () => {
  const day = 300;

  it('is null when there is no saved run', () => {
    expect(inflightResume({}, day)).toBeNull();
    expect(inflightResume(null, day)).toBeNull();
  });

  it('is null when the saved run belongs to another day', () => {
    expect(inflightResume({ inflight: { day: day - 1, answers: answers(5) } }, day)).toBeNull();
    expect(inflightResume({ inflight: { day: day + 1, answers: answers(5) } }, day)).toBeNull();
  });

  it('resolves today’s run through resumePoint', () => {
    const r = inflightResume({ inflight: { day, answers: answers(5) } }, day);
    expect(r).toEqual(resumePoint(answers(5), 16));
  });

  it('reports a finished run as done', () => {
    expect(inflightResume({ inflight: { day, answers: answers(16) } }, day).done).toBe(true);
  });

  it('survives a corrupt inflight rather than throwing', () => {
    for (const f of ['x', 42, [], { day }, { day, answers: 'nope' }]) {
      expect(() => inflightResume({ inflight: f }, day), JSON.stringify(f)).not.toThrow();
    }
    expect(inflightResume({ inflight: { day, answers: 'nope' } }, day)).toMatchObject({ done: false, idx: 0 });
  });
});
