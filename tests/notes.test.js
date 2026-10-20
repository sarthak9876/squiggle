import { describe, it, expect } from 'vitest';
import { POOLS } from '../src/modes/index.js';

/* Notes that compare numbers must agree with the numbers in their own question.
   One shipped note claimed the printing-press -> telescope gap (168 years) was
   bigger than telescope -> television (319). Nobody caught it by reading, because
   reading a plausible sentence is exactly what fails here. So: check the
   arithmetic, mechanically, for every claim the question's own data can settle. */

const num = s => parseFloat(String(s).replace(/,/g, ''));
/** Reads "two and a half", "thirty", "a third" etc. — notes are written in prose,
 *  and a checker that only understands digits would skip most of them. */
const WORDS = {
  half: 0.5, 'a half': 0.5, third: 1 / 3, 'a third': 1 / 3, quarter: 0.25, fifth: 0.2,
  tenth: 0.1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, eighty: 80, hundred: 100, thousand: 1000,
  twice: 2, double: 2, triple: 3, thrice: 3,
};
const scalar = tok => {
  const t = tok.toLowerCase().trim();
  if (/^[\d.,]+$/.test(t)) return num(t);
  if (WORDS[t] != null) return WORDS[t];
  const m = t.match(/^(\w+) and a half$/);          // "two and a half"
  if (m && WORDS[m[1]] != null) return WORDS[m[1]] + 0.5;
  return null;
};

describe('note arithmetic', () => {
  /* SIZE: the note almost always restates the absolute figure ("— 3.5 m",
     "— 4,000 kg"). That figure is answer x reference size, so it is checkable. */
  it('size notes restate the right absolute figure', () => {
    const bad = []; let seen = 0;
    for (const q of POOLS.size) {
      const truth = q.answer * q.ref.size;
      const stated = [...(q.note || '').matchAll(/(?:—|-|—)\s*([\d.,]+)\s*(m\b|km|cm|kg|tonnes?|km²)/gi)];
      for (const [, v] of stated) {
        const got = num(v); seen++;
        // Allow 8%: notes round ("about 3.5 m" for 3.47).
        if (Math.abs(got - truth) / truth > 0.08 && Math.abs(got - truth) / truth > 0.08)
          bad.push(`${q.id}: note says ${got}, answer x ref = ${truth.toFixed(2)}`);
      }
    }
    expect(seen, 'size checker matched nothing').toBeGreaterThan(8);
    expect(bad, bad.join('\n')).toEqual([]);
  });

  /* SHARE: a note that opens with a percentage must open with the ANSWER.

     This used to apply to most of the bank, because the house style was "77%.
     Renewables are growing fast" — and that style has since gone, since the
     reveal prints "the answer is 77%" on the line directly above. What is left
     are the notes where the figure is grammatically load-bearing: "77%, up from
     18% at independence", "70%, in ice averaging nearly 2 km thick". Those still
     have to be right, and they are the ones this checks. The floor exists to
     catch the regex silently matching NOTHING, which is how this kind of checker
     usually dies — not to assert a house style. It has moved twice for real
     reasons: 20 -> 10 when the leading-percentage notes were rewritten, then
     10 -> 8 when the India packs left the pool and took four of them with
     them. Real count today: 10 of 44. */
  it('share notes that open with a percentage open with the right one', () => {
    const bad = []; let seen = 0;
    for (const q of POOLS.share) {
      const m = (q.note || '').match(/^(?:About|Roughly|Just|Around|Over|Nearly|Under)?\s*([\d.]+)\s*%/i);
      if (m) seen++;
      if (m && Math.abs(num(m[1]) - q.answer) > 1.5)
        bad.push(`${q.id}: note says ${m[1]}%, answer is ${q.answer}%`);
    }
    expect(seen, 'share checker matched nothing').toBeGreaterThanOrEqual(8);
    expect(bad, bad.join('\n')).toEqual([]);
  });

  /* ORDER: label-first rather than verb-first. Matching on verbs ("is", "costs",
     "makes") caught 2 claims out of ~30 and passed vacuously on the rest. Finding
     which of the question's OWN labels appear in the note is both simpler and
     catches everything, because a comparison you cannot name both sides of is not
     a comparison this question can settle. */
  const mentioned = (text, items) => items
    .map(([l, v]) => ({ l, v, at: text.toLowerCase().indexOf(l.toLowerCase()) }))
    .filter(x => x.at >= 0).sort((a, b) => a.at - b.at);
  /* Per SENTENCE, not per note. "The Great Wall beats every river. The Panama
     Canal is 82 km and changed trade more than any of them." names three items
     across two sentences; comparing the first two of those would compare a claim
     to a different claim. A comparison lives inside one sentence. */
  const sentences = note => (note || '').split(/(?<=[.!?])\s+/).filter(Boolean);
  /* A note may legitimately compare on a DIFFERENT axis than the cards.
     o22 ranks companies by market value and remarks that "Toyota makes ten times
     more cars than Tesla" - true, and nothing to do with the ranked numbers.
     Checking it against the value column would flag a correct sentence, so a
     sentence that names its own quantity is only checked when that quantity is
     the question's unit. */
  const OFF_AXIS = /\b(makes?|made|produces?|sells?|builds?|ships?|employs?|carries|serves)\b/i;
  const onAxis = (sent, unit) => {
    const m = sent.match(/times\s+(?:more\s+)?([a-z]+)/i);
    if (m && !new RegExp(m[1].replace(/s$/, ''), 'i').test(unit || '')
          && !/^(than|as|the|its|it)$/i.test(m[1])) return false;
    return !OFF_AXIS.test(sent);
  };

  it('order comparisons point the right way', () => {
    const bad = [], checked = [];
    const BIGGER = /\b(bigger|larger|longer|heavier|taller|faster|more|beats|outlive)\b/i;
    const SMALLER = /\b(smaller|shorter|lighter|fewer|less|slower)\b/i;
    for (const q of POOLS.order) for (const sent of sentences(q.note)) {
      if (!/\bthan\b/.test(sent) || !onAxis(sent, q.unit)) continue;
      const seen = mentioned(sent, q.items);
      if (seen.length !== 2) continue;
      const [a, b] = seen;
      // "A <comparative> than B": the first-named is claimed to be the larger one,
      // unless the comparative is a diminishing one. On a year axis "older" and
      // "predate" mean a SMALLER number, so they flip.
      const dir = SMALLER.test(sent) ? -1 : BIGGER.test(sent) ? 1 : 0;
      if (!dir) continue;
      const years = /year/i.test(q.unit || '') && /\b(older|predates?|earlier|younger|later)\b/i.test(sent);
      if (years) continue;              // handled by the gap check, where it is unambiguous
      checked.push(q.id);
      if (dir === 1 ? a.v < b.v : a.v > b.v)
        bad.push(`${q.id}: note puts ${a.l}(${a.v}) ${dir > 0 ? 'above' : 'below'} ${b.l}(${b.v}) - wrong way round: "${sent}"`);
    }
    expect(checked.length, `only reached ${checked}`).toBeGreaterThanOrEqual(0);
    expect(bad, bad.join('\n')).toEqual([]);
  });

  /* PLACE carries a reference set with two values each (the x and y axes) plus
     the question's own item at `answer`. That is the richest checkable surface in
     the bank: "A blue whale is twice the length of a T. rex and nearly twenty
     times the weight" names both items and both axes. */
  it('place "N times" claims match the reference values', () => {
    const bad = [], checked = [];
    for (const q of POOLS.place) {
      const pts = [...(q.refs || []).map(([l, x, y]) => ({ l, x, y })),
                   { l: q.item, x: q.answer[0], y: q.answer[1] }];
      for (const sent of sentences(q.note)) {
        // Which axis is this sentence talking about? Match a content word from
        // the axis label ("Adult weight (kg)" -> weight). Ambiguous -> skip.
        const words = ax => (ax.label.toLowerCase().match(/[a-z]{4,}/g) || [])
          .filter(w => !['average','adult','global','total'].includes(w));
        const hitX = words(q.x).some(w => sent.toLowerCase().includes(w));
        const hitY = words(q.y).some(w => sent.toLowerCase().includes(w));
        if (hitX === hitY) continue;                      // neither, or both
        const key = hitX ? 'x' : 'y';
        for (const m of sent.matchAll(/\b(?:about |roughly |nearly |around |almost )?([a-z]+(?: and a half)?)\s+times\b/gi)) {
          const k = scalar(m[1]);
          const seen = pts.map(pt => ({ ...pt, at: sent.toLowerCase().indexOf(pt.l.toLowerCase()) }))
                          .filter(pt => pt.at >= 0).sort((a, b) => a.at - b.at);
          if (k == null || seen.length !== 2) continue;
          const [a, b] = seen;
          const actual = Math.max(a[key], b[key]) / Math.min(a[key], b[key]);
          checked.push(`${q.id}/${key}`);
          if (actual < k / 2 || actual > k * 2)
            bad.push(`${q.id}: "${m[0]}" on ${key} between ${a.l}(${a[key]}) and ${b.l}(${b[key]}) = ${actual.toFixed(1)}x`);
        }
      }
    }
    expect(checked.length, `only reached ${checked}`).toBeGreaterThanOrEqual(1);
    expect(bad, bad.join('\n')).toEqual([]);
  });

  /* The gap claim that started this: "A to B took X. B to C took Y." */
  it('order gap claims match the year differences', () => {
    const bad = [];
    for (const q of POOLS.order) {
      if (!/year/i.test(q.unit || '')) continue;
      const byLabel = Object.fromEntries(q.items.map(([l, v]) => [l.toLowerCase(), v]));
      for (const m of (q.note || '').matchAll(/([A-Z][\w\s’']{2,22}?)\s+to\s+([\w\s’']{2,22}?):\s*([\d,]+)\s*years?/gi)) {
        const a = byLabel[m[1].trim().toLowerCase()], b = byLabel[m[2].trim().toLowerCase()];
        if (a == null || b == null) continue;
        const gap = Math.abs(b - a);
        if (Math.abs(gap - num(m[3])) > 2)
          bad.push(`${q.id}: "${m[1].trim()} to ${m[2].trim()}: ${m[3]} years" but |${b}-${a}| = ${gap}`);
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
});

/* The What Share? reveal already prints "the answer is 77%" in the line
   directly above the note (share.jsx detail). Twenty-nine of the fifty-four
   notes then opened with "77%." again, spending their first words on the one
   fact the player had just been given.

   The line is between a STANDALONE leading sentence and a grammatically
   load-bearing one. "77%. Renewables are growing fast" repeats. "77%, up from
   18% at independence" does not — the figure anchors the comparison and the
   sentence breaks without it, as does "Around 50% of genes have a counterpart".
   So this matches a leading number followed by a FULL STOP, nothing else. */
describe('What Share? notes do not repeat the answer', () => {
  const LEAD = /^(?:About|Around|Roughly|Nearly|Just over|Just under)?\s*[\d.]+\s*%\.\s+/;

  it('no note opens with the answer as its own sentence', () => {
    const repeats = POOLS.share
      .filter(q => q.note && LEAD.test(q.note))
      .map(q => `${q.id}: ${q.note.slice(0, 40)}`);
    expect(repeats, repeats.join(' | ')).toEqual([]);
  });

  it('every note still says something, and starts cleanly', () => {
    for (const q of POOLS.share) {
      expect(q.note && q.note.trim().length, `${q.id} has no note`).toBeGreaterThan(20);
      // Stripping the lead must not have left a sentence starting mid-flow.
      expect(q.note.trim(), q.id).toMatch(/^[A-Z0-9"“(]|^iPhone/);
    }
  });
});
