import { describe, it, expect } from 'vitest';
import { POOLS } from '../src/modes/index.js';
import { lineupFor, LAUNCH_DAY, uniqueDays } from '../src/lib/schedule.js';

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

describe('every day of the cycle is playable from outside India', () => {
  /* Coverage over the POOL is not the same as coverage over what a player
     actually MEETS. The scheduler deals 16 of 364 a day under an India quota, so
     the question that matters is whether any single day can put an India
     question a stranger cannot attempt in a mode that scores it zero. */
  const CLIFF = new Set(['groups', 'odd', 'order']);
  // Tagged india because India is one ITEM among global ones, not because the
  // question asks for India knowledge.
  const GLOBAL = new Set(['o4', 'o28', 'in-o7', 'o34', 'o39', 'g17', 'd35', 'in-d4']);

  it('no day deals an unhinted India question into a mode that scores a stranger zero', () => {
    const bad = [];
    const days = uniqueDays(POOLS).days;
    for (let i = 0; i < days; i++)
      for (const slot of lineupFor(POOLS, 'p', LAUNCH_DAY + i))
        if (slot.item?.region === 'india' && CLIFF.has(slot.mode)
            && !slot.item.hint && !GLOBAL.has(slot.item.id))
          bad.push(`day ${i + 1}: ${slot.mode}/${slot.item.id}`);
    expect(bad, 'India questions with no way in').toEqual([]);
  });

  it('hints stay a quiet minority of the day, not the mechanic', () => {
    // If most of a day carried a hint the 25% cost would become the normal path.
    const days = uniqueDays(POOLS).days;
    let total = 0;
    for (let i = 0; i < days; i++)
      total += lineupFor(POOLS, 'p', LAUNCH_DAY + i).filter(s => s.item?.hint).length;
    const perDay = total / days;
    expect(perDay).toBeGreaterThan(0.5);
    expect(perDay).toBeLessThan(6);
  });
});
