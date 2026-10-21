/* Question ids are strings everywhere, except the first fifteen Draw The Curve
   questions, which were numbers — 1..15 — while 16 onwards are 'dr16'..'dr34'
   in the same array. Nothing was broken by it: every comparison goes through
   String(), so a stored 2 still matched. It is a trap rather than a bug, and
   the kind that is cheap now and expensive the first time someone writes
   `ids.includes(id)` without the String().

   Renaming them strands ids already saved in a player's practice queue, so the
   rename comes with a migration. Without it the queue simply rerolls — not a
   crash, but five questions thrown away mid-run. */
import { describe, it, expect } from 'vitest';
import { ALL_POOLS } from '../src/modes/index.js';
import { migrateIds } from '../src/lib/storage.js';

describe('every question id is a string', () => {
  for (const [mode, pool] of Object.entries(ALL_POOLS)) {
    it(`${mode}`, () => {
      const numeric = pool.filter(q => typeof q.id !== 'string').map(q => `${q.id} (${typeof q.id})`);
      expect(numeric, numeric.join(', ')).toEqual([]);
    });
  }

  it('ids are unique across the whole bank', () => {
    const all = Object.values(ALL_POOLS).flat().map(q => q.id);
    expect(new Set(all).size).toBe(all.length);
  });

  it('the renamed draw ids all exist and did not collide', () => {
    const ids = new Set(ALL_POOLS.draw.map(q => q.id));
    for (let n = 1; n <= 34; n++) expect(ids.has(`dr${n}`), `dr${n}`).toBe(true);
  });
});

describe('a practice queue saved before the rename', () => {
  it('has its numeric draw ids carried over', () => {
    const before = {
      practice: { draw: { ids: [2, 7, 'dr20'], answers: [], idx: 0 } },
      lastPractice: { draw: [1, 15] },
    };
    const after = migrateIds(before);
    expect(after.practice.draw.ids).toEqual(['dr2', 'dr7', 'dr20']);
    expect(after.lastPractice.draw).toEqual(['dr1', 'dr15']);
  });

  it('leaves every other mode alone', () => {
    const before = { practice: { odd: { ids: ['d1', 'd2'], answers: [], idx: 0 } } };
    expect(migrateIds(before).practice.odd.ids).toEqual(['d1', 'd2']);
  });

  it('is idempotent — running it twice changes nothing', () => {
    const once = migrateIds({ practice: { draw: { ids: [2], answers: [], idx: 0 } } });
    expect(migrateIds(once)).toEqual(once);
  });

  it('never throws on a shape it did not expect', () => {
    for (const s of [null, undefined, 'x', 42, {}, { practice: 'x' }, { practice: { draw: 'x' } },
                     { lastPractice: 42 }, { practice: { draw: { ids: 'x' } } }]) {
      expect(() => migrateIds(s), JSON.stringify(s)).not.toThrow();
    }
  });
});
