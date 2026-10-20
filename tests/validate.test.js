import { describe, it, expect } from 'vitest';
import { POOLS } from '../src/modes/index.js';
import { validateAll, validateQuestion } from '../src/lib/validate.js';

/* Two content files once carried comments claiming a validate.js enforced these
   rules. There was no validate.js. The rules were real and the enforcement was
   imaginary, which is how d7 shipped: Moon / Mars / Venus / Jupiter where EVERY
   distractor was a true statement about a different item, so a player who chose
   Jupiter and "the only gas giant" — both correct — scored zero. */

const problems = validateAll(POOLS);
const gaps  = problems.filter(p => p.includes('too close to order'));
const hard  = problems.filter(p => !p.includes('too close to order'));

describe('every question is structurally sound', () => {
  it('no duplicate options, no out-of-range indexes, no duplicate reasons', () => {
    expect(hard, hard.slice(0, 10).join('\n')).toEqual([]);
  });

  it('no Odd One Out distractor names an item that is not the answer', () => {
    // The authoring tell behind d7: a distractor written as a true sentence
    // ABOUT one of the other items. It cannot prove truth; it catches the habit.
    const named = problems.filter(p => p.includes('names'));
    expect(named, named.join('\n')).toEqual([]);
  });

  it('every Odd One Out attests exactly one true reason', () => {
    const wrong = Object.values(POOLS).flat().filter(q => q.reasons && q.trueCount !== 1);
    expect(wrong.map(q => q.id)).toEqual([]);
  });

  /* Ordered values closer than 15% are a coin flip, not a question. 27 remain
     and each is listed in CONTENT_AUDIT.md — this is a RATCHET, so the number
     can fall but never rise. It caught the one the playtest flagged
     independently: candle flame 1,000 against lava 1,100, which is contested
     anyway (candles peak near 1,400, lava runs 700-1,200). */
  it('ordered values do not get closer together than they are today', () => {
    expect(gaps.length, gaps.slice(0, 5).join('\n')).toBeLessThanOrEqual(27);
  });
});

describe('validateQuestion catches what it claims to', () => {
  it('flags a duplicate option', () => {
    expect(validateQuestion('shadow', { id: 'x', options: ['cat', 'dog', 'cat'] }).length).toBe(1);
  });
  it('flags an odd index outside the item list', () => {
    const bad = validateQuestion('odd', { id: 'x', items: ['a', 'b'], odd: 5, reasons: ['r'], reason: 0, trueCount: 1 });
    expect(bad.some(m => m.includes('outside'))).toBe(true);
  });
  it('flags a distractor that names another item', () => {
    const bad = validateQuestion('odd', {
      id: 'x', items: ['Moon', 'Jupiter'], odd: 0, trueCount: 1, reason: 0,
      reasons: ['It orbits a planet', 'It is the only gas giant like Jupiter'],
    });
    expect(bad.some(m => m.includes('names "Jupiter"'))).toBe(true);
  });
  it('judges YEARS by distance, not percentage', () => {
    // 1440 and 1608 are 10% apart and 168 years apart. Only one of those matters.
    const years = validateQuestion('order', { id: 'x', unit: 'year', items: [['a', 1440], ['b', 1608]] });
    expect(years).toEqual([]);
    const tight = validateQuestion('order', { id: 'y', unit: 'year', items: [['a', 1980], ['b', 1981]] });
    expect(tight.length).toBe(1);
  });
});
