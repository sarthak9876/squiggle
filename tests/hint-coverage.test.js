import { describe, it, expect } from 'vitest';
import { POOLS } from '../src/modes/index.js';

/* The hint mechanism exists so that a question naming something you have never
   heard of is difficulty rather than frustration (src/lib/hint.js). It shipped
   attached to three questions out of 365, none of them the ones that needed it:
   a player outside India met nine untranslated Hindi words in Make The Sets,
   which has no partial credit, and scored zero for not living somewhere.

   These tests pin the two things that went wrong: coverage, and leakage. */

const indiaIn = mode => POOLS[mode].filter(q => q.region === 'india');

describe('hint coverage where a wrong guess costs everything', () => {
  /* GROUPS is scored on pairs within a set, so a player who cannot identify the
     categories scores near zero — there is no partial credit for being close.
     ODD is two 50-point halves with no middle ground. These are the two modes
     where unfamiliar proper nouns are fatal rather than merely hard. */
  for (const mode of ['groups', 'odd']) {
    it(`every India-tagged ${mode} question carries a hint`, () => {
      const missing = indiaIn(mode).filter(q => !q.hint).map(q => q.id);
      expect(missing, `${mode} questions with no hint`).toEqual([]);
    });
  }

  it('the bank still leans on hints where the subject is named, not everywhere', () => {
    // A hint on every question would make the mechanic meaningless; a hint on
    // almost none is what we started from. This is a floor, not a target.
    const all = Object.values(POOLS).flat();
    expect(all.filter(q => q.hint).length).toBeGreaterThanOrEqual(30);
  });
});

describe('a hint never hands over its own answer', () => {
  it('no Make The Sets hint names one of its own nine items', () => {
    /* The answer in GROUPS is the PARTITION. Naming an item next to a category
       name gives away where it goes — and worse, g36 holds "Signal" the
       messaging app beside a "things that carry a signal" set, so the word alone
       pushed the player into the trap the puzzle is built on. */
    const leaks = [];
    for (const q of POOLS.groups) {
      if (!q.hint) continue;
      const h = q.hint.toLowerCase();
      for (const item of q.groups.flatMap(g => g.items))
        if (h.includes(item.toLowerCase())) leaks.push(`${q.id}: "${item}"`);
    }
    expect(leaks, 'hints naming their own items').toEqual([]);
  });

  it('no Odd One Out hint restates the reason that scores', () => {
    /* Caught on d35: the hint read "Bitcoin is not issued by any country" while
       the scoring reason was "the only one no government issues" — the same
       sentence. Identify the items; never state the discriminator. */
    const stop = new Set(['the','only','one','that','is','it','not','a','an','and','of','in','to','with','are','by','no','which']);
    /* Crude stemming, because the first version of this test compared whole
       words and so missed "issues" against "issued" — it passed with the very
       leak it was written to catch still in the file. */
    const stem = w => w.replace(/(ing|ed|es|s)$/, '');
    const words = t => t.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
      .filter(w => w.length > 3 && !stop.has(w)).map(stem);
    const leaks = [];
    for (const q of POOLS.odd) {
      if (!q.hint || typeof q.reason !== 'number') continue;
      const reason = new Set(words(q.reasons[q.reason]));
      const shared = words(q.hint).filter(w => reason.has(w));
      // Two or more content words from the scoring reason is a restatement.
      if (shared.length >= 2) leaks.push(`${q.id}: shares "${shared.join('", "')}" with its reason`);
    }
    expect(leaks, 'hints restating the scoring reason').toEqual([]);
  });

  it('no hint restates a group label verbatim alongside its items', () => {
    // Naming the categories is allowed and is the point; naming a category AND
    // an item in the same breath is not.
    for (const q of POOLS.groups) {
      if (!q.hint) continue;
      expect(q.hint.length, `${q.id} hint`).toBeGreaterThan(24);
      expect(q.hint.length, `${q.id} hint`).toBeLessThan(220);
    }
  });
});
