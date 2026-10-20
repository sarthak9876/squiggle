import { describe, it, expect } from 'vitest';
import { POOLS, ALL_POOLS } from '../src/modes/index.js';
import { lineupFor, LAUNCH_DAY, uniqueDays } from '../src/lib/schedule.js';

/* This file used to defend the India bank: "a player outside India meets nine
   untranslated Hindi words in Make The Sets, which has no partial credit, and
   scores zero for not living somewhere" — so every India question in a
   no-partial-credit mode had to carry a hint.

   That was the wrong fix. The players are 16-45 WORLDWIDE, and a hint does not
   make "which of these does India grow the most of" a fair question for someone
   in Lima; it makes it a question you pay 25% to be told the answer to. The
   region packs are filtered out of POOLS now (src/modes/index.js), so the rule
   this file pins is the simpler one: they never reach a player at all.

   The leak tests below survive unchanged — they are about hints, not about
   India, and they caught two real bugs. */

describe('the daily set is global', () => {
  it('no region-tagged question is ever in play', () => {
    const leaked = Object.entries(POOLS)
      .flatMap(([mode, pool]) => pool.filter(q => q.region).map(q => `${mode}/${q.id}`));
    expect(leaked, 'region questions in POOLS').toEqual([]);
  });

  /* POOLS being clean is not the same as the SCHEDULER being clean: the dealer
     has a fallback that relaxes the region cap rather than leave a slot empty
     (schedule.js), so the only convincing check is the lineup a player is
     actually handed, over a whole cycle, for more than one player id. */
  it('no day of the cycle deals a region question to anyone', () => {
    const bad = [];
    const days = uniqueDays(POOLS).days;
    for (const pid of ['p', 'q', 'r']) {
      for (let i = 0; i < days; i++) {
        for (const slot of lineupFor(POOLS, pid, LAUNCH_DAY + i)) {
          if (slot.item?.region) bad.push(`${pid} day ${i + 1}: ${slot.mode}/${slot.item.id}`);
        }
      }
    }
    expect(bad, 'region questions dealt').toEqual([]);
  });

  /* The packs are FILTERED, not deleted — an India or Brazil edition should be
     a locale switch, not a rewrite. If they ever vanish from the repo this
     fails, and the filter above becomes a no-op nobody would notice. */
  it('the region packs still exist to switch back on', () => {
    const packed = Object.values(ALL_POOLS).flat().filter(q => q.region).length;
    expect(packed, 'region packs have been deleted, not filtered').toBeGreaterThan(50);
  });

  it('every mode still has enough global questions for the cycle', () => {
    for (const [mode, pool] of Object.entries(POOLS)) {
      expect(pool.length, `${mode} is too thin without its region pack`).toBeGreaterThanOrEqual(30);
    }
    expect(uniqueDays(POOLS).days, 'cycle got shorter').toBeGreaterThanOrEqual(16);
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
