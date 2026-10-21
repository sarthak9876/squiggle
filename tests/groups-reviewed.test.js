/* A Make The Sets group must be true of every item in it, and of no item
   outside it.

   g11 sorted nine things by a hidden word: things with KEYS, with a CROWN, with
   a MOUTH. Piano has keys, a map has a key — and a passport has none. The
   category simply was not true of the third item, so the only route to the
   answer was elimination.

   Same shape as the Odd One Out distractors, and the same reason it cannot be
   a computed check: whether a passport has a key is a fact about passports.
   So this gates REVIEW. The hash covers each group's label and items. Change
   one and the test fails until a human has re-checked that the label is true
   of all three, and true of nothing in the other two groups.

   What a human should check when this fires:
     1. the label is literally true of each of its three items;
     2. no item in another group also satisfies this label — one partition
        must work, not two;
     3. the senses differ enough to be a puzzle rather than a list. */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { GROUPS } from '../src/content/groups.js';

const NUL = String.fromCharCode(0);
const hashOf = q => createHash('sha256')
  .update(q.groups.map(g => g.label + ':' + g.items.join(',')).join(NUL))
  .digest('hex').slice(0, 12);

/* id -> hash of its labels and items, as reviewed on 2026-10-21. */
const REVIEWED = {
  "g1": "d3cbb3fcf166",
  "g2": "47670d1d22d0",
  "g3": "dd8482ca5340",
  "g4": "851ed1849481",
  "g5": "4c1171047f62",
  "g6": "e57b67a01d55",
  "g7": "38edcb7034cb",
  "g8": "67c1e1c4a392",
  "g9": "305a272d2f9f",
  "g10": "203564f01d73",
  "g11": "2c486919e79d",
  "g12": "9431eea82c20",
  "g13": "10728038ff02",
  "g14": "50bb2770b605",
  "g15": "e80d9d95b770",
  "g16": "5b4825a85fa4",
  "g17": "d9cc462b6296",
  "g18": "cc0f4a94be13",
  "g19": "cf9d15d65be0",
  "g20": "65b7b72ddfc3",
  "g21": "c6349fc55934",
  "g22": "5f75ff94dd7d",
  "g23": "048068bb7e77",
  "g24": "8fc72355f467",
  "g25": "a312f581dadc",
  "g26": "e677a7b44583",
  "g27": "937089aa0aa0",
  "g28": "cdecac162618",
  "g29": "3fd99a2dcfde",
  "g30": "476e4f5b8026",
  "g31": "124072887178",
  "g32": "d5cb9efc4d47",
  "g33": "b72fd550f1a4",
  "in-g1": "7266efddf2c9",
  "in-g2": "fa0e55742147",
  "in-g3": "f508e0991faf",
  "in-g4": "d8f00010dd3b",
  "in-g5": "e1a29041b69f",
  "in-g6": "eb6e786941e9",
  "in-g7": "3b7b29cdcbd8",
  "in-g8": "0fad847c4044",
  "g34": "cb98f46bc986",
  "g35": "4c18aab2201b",
  "g36": "d23643ebf1a4",
};

describe('Make The Sets groups have been checked against their items', () => {
  it('every question is in the reviewed registry', () => {
    const missing = GROUPS.filter(q => !(q.id in REVIEWED)).map(q => q.id);
    expect(missing, missing.length
      ? `New: ${missing.join(', ')}. Check each label is true of all three items and of nothing `
        + `in the other groups, then add: ${missing.map(id => `"${id}": "${hashOf(GROUPS.find(q => q.id === id))}"`).join(', ')}`
      : '').toEqual([]);
  });

  it('no reviewed question has changed since', () => {
    const drifted = GROUPS.filter(q => q.id in REVIEWED && hashOf(q) !== REVIEWED[q.id])
      .map(q => `${q.id}: now "${hashOf(q)}"\n     ` + q.groups.map(g => `${g.label}: ${g.items.join(', ')}`).join('\n     '));
    expect(drifted, drifted.length
      ? 'Groups changed. Confirm each label is true of all three items and of nothing in the others, then update the hash:\n  ' + drifted.join('\n  ')
      : '').toEqual([]);
  });

  it('the registry has no entries for questions that no longer exist', () => {
    const ids = new Set(GROUPS.map(q => q.id));
    expect(Object.keys(REVIEWED).filter(id => !ids.has(id))).toEqual([]);
  });

  it('no item appears in two groups of the same question', () => {
    // The one part that IS mechanical: a literal duplicate makes the puzzle
    // unsolvable rather than merely unfair.
    const bad = [];
    for (const q of GROUPS) {
      const all = q.groups.flatMap(g => g.items);
      if (new Set(all).size !== all.length) bad.push(q.id);
    }
    expect(bad).toEqual([]);
  });
});
