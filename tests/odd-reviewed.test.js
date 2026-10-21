/* Every Odd One Out distractor must be FALSE OF EVERY ITEM.

   Not "false of the odd one" — false of all four. Scoring is
   `pick === odd ? 50 : 0` plus `reason === item.reason ? 50 : 0`, so a
   distractor that happens to be TRUE of some other item does not create a tie:
   it hands 0 to the player who spotted a real fact. The question then punishes
   exactly the person who knows the most.

   This was not one slip. Eleven distractors across ten questions were shipped
   with a source comment of the form "// false - that is the Yamuna", which is
   the author applying the wrong test and writing down the proof:

     d8  / d32  "the only one named after an animal"   -> true of Python
     d14         "the only one with glaciers"           -> true of Greenland
     d14         "the only one with an active volcano"  -> true of New Guinea
     d16         "the only one that tastes hot"         -> true of Chilli
     d16         "the only one native to Asia"          -> true of Aubergine
     d19         "the only one with a fixed supply"     -> true of Bitcoin
     d27         "a day lasts longer than a year"       -> true of VENUS
     d33         "built on a river delta"               -> true of Shanghai
     in-d7       "the only one spoken outside India"    -> true of Bengali
     in-d8       "the only one that reached the Moon"   -> true of Chandrayaan-3
     in-d9       "the only one that is a tributary"     -> true of the Yamuna

   d14 and d19 had each been FIXED for this once already and the replacement
   reintroduced it, which is why a convention in a comment is not enough.

   Why a registry and not a detector. The obvious heuristic — "the comment names
   one of the question's own items" — finds all eleven, and also flags d2, d4,
   d6, d11, d20 and one of d33's, which are all correct: a property shared by
   TWO items is legitimately false of each. A check that cries wolf a third of
   the time gets ignored, and an ignored check is worse than none.

   Truth is not computable here, so this gates REVIEW instead. The hash covers
   the reason strings. Change one and this fails until a human has re-checked
   the new wording against every item and updated the hash. That is the whole
   point: you cannot alter a distractor without someone confirming it is false
   of all four. Adding a question fails too, for the same reason.

   To update: run the test, read the diff it prints, CHECK THE CLAIM AGAINST
   EVERY ITEM, then paste the new hash in. */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { ODD } from '../src/content/odd.js';

const NUL = String.fromCharCode(0);
const hashOf = q => createHash('sha256').update(q.reasons.join(NUL)).digest('hex').slice(0, 12);

/* id -> hash of its reasons, as reviewed on 2026-10-21. */
const REVIEWED = {
  "d1": "68b388870aa8",
  "d2": "ae321545f4a8",
  "d3": "08bcc668538d",
  "d4": "f0d663889cc8",
  "d5": "b46a1ff57df7",
  "d6": "8aec06ffdc8f",
  "d7": "fd970b1bd00a",
  "d8": "1395a632cb1c",
  "d9": "872a21bce783",
  "d10": "0456ff22d9b9",
  "d11": "b768edbf546a",
  "d12": "3e5c2388ffe4",
  "d13": "88c2f307da7b",
  "d14": "6b7061357a1e",
  "d15": "adcefd7bfb32",
  "d16": "8c3270b1ddf3",
  "d17": "da9f62909dfb",
  "d18": "2582cd836c11",
  "d19": "72014bb63cca",
  "d20": "1d4ea5b2f4bf",
  "d21": "83c1cc0030ad",
  "d22": "2b83e1490d8a",
  "d23": "a79579465fda",
  "d24": "a3948787d716",
  "d25": "d0f143a68b01",
  "d26": "8036e346b46c",
  "d27": "9be788dca34a",
  "d28": "89978f34a4c1",
  "d29": "333ca69f3d95",
  "d30": "40e32d155d22",
  "in-d1": "45bf8d012329",
  "in-d2": "8f7b7cecf42a",
  "in-d3": "9228cfc4e3b8",
  "in-d4": "395b7187c89e",
  "in-d5": "8fe6099b8da4",
  "in-d6": "8fa295d121c6",
  "in-d7": "1b4324e41862",
  "in-d8": "f8d87fd2c6bd",
  "in-d9": "a66b682bf671",
  "d31": "d9573669ad38",
  "d32": "499c879d703f",
  "d33": "66f5f7f37e4b",
  "d34": "991a76b44a55",
  "d35": "8dd1a33fde41",
};

describe('Odd One Out distractors have been checked against every item', () => {
  it('every question is in the reviewed registry', () => {
    const missing = ODD.filter(q => !(q.id in REVIEWED)).map(q => q.id);
    expect(missing, missing.length
      ? `New question(s): ${missing.join(', ')}. Check each distractor is FALSE OF EVERY ITEM `
        + `(not just of the odd one), then add: ${missing.map(id => `"${id}": "${hashOf(ODD.find(q => q.id === id))}"`).join(', ')}`
      : '').toEqual([]);
  });

  it('no reviewed question has had its reasons changed since', () => {
    const drifted = ODD.filter(q => q.id in REVIEWED && hashOf(q) !== REVIEWED[q.id])
      .map(q => `${q.id}: now "${hashOf(q)}"\n     ${q.reasons.join('\n     ')}`);
    expect(drifted, drifted.length
      ? 'Reasons changed. Confirm each is false of EVERY item, then update the hash:\n  ' + drifted.join('\n  ')
      : '').toEqual([]);
  });

  it('the registry has no entries for questions that no longer exist', () => {
    const ids = new Set(ODD.map(q => q.id));
    expect(Object.keys(REVIEWED).filter(id => !ids.has(id))).toEqual([]);
  });

  it('the authored reason is always a real index into the reasons', () => {
    // Cheap, and it is the one part of this that IS mechanical.
    const bad = ODD.filter(q => !(q.reason >= 0 && q.reason < q.reasons.length)
                             || !(q.odd >= 0 && q.odd < q.items.length)).map(q => q.id);
    expect(bad).toEqual([]);
  });
});
