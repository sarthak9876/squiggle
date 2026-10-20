/* Structural checks a question must pass before it can be trusted.

   This file exists because two content files once CLAIMED it existed — their
   comments said a validate.js enforced the rules, and nothing did. The rules
   were real; the enforcement was imaginary.

   What this can and cannot do: it checks STRUCTURE, never truth. "Is this
   sentence also true of the outlier?" is semantic and no linter will settle it.
   What it does catch is the shape of the failure that keeps shipping — an Odd
   One Out whose distractors were each written as a true statement about a
   DIFFERENT item (d7: "the only gas giant" of Jupiter, "hotter than 400C" of
   Venus), so a player who picked a correct pairing scored zero. */

/** Adjacent ORDER values closer than this are not a question, they are a toss-up. */
export const ORDER_MIN_GAP = 0.15;

const dupes = list => list.filter((v, i) => list.indexOf(v) !== i);

/** @returns {string[]} one message per problem; empty means it passes. */
export function validateQuestion(mode, q) {
  const bad = [];
  const id = q.id || '(no id)';

  // Every mode: an option offered twice is never the answer twice.
  const opts = q.options || q.items;
  if (Array.isArray(opts) && typeof opts[0] === 'string') {
    for (const d of new Set(dupes(opts))) bad.push(`${id}: option "${d}" appears twice`);
  }

  if (mode === 'odd') {
    const n = q.items?.length ?? 0;
    if (!(q.odd >= 0 && q.odd < n)) bad.push(`${id}: odd index ${q.odd} is outside 0..${n - 1}`);
    if (!(q.reason >= 0 && q.reason < (q.reasons?.length ?? 0)))
      bad.push(`${id}: reason index ${q.reason} is outside the reasons list`);
    for (const d of new Set(dupes(q.reasons || []))) bad.push(`${id}: reason "${d}" appears twice`);
    if (q.trueCount !== 1) bad.push(`${id}: trueCount is ${q.trueCount}, and exactly one reason may be true`);

    /* A distractor that NAMES a non-answer item is the tell that it was written
       as a true statement about that item — exactly how d7 ended up with four
       true reasons. It cannot prove truth, but it catches the authoring habit. */
    (q.reasons || []).forEach((r, i) => {
      if (i === q.reason) return;
      const lower = String(r).toLowerCase();
      (q.items || []).forEach((item, k) => {
        if (k === q.odd) return;
        const name = String(item).toLowerCase();
        // "closer to the Sun than Earth" uses Earth as a RULER, not as a claim
        // about Earth. Only a bare mention is the authoring tell.
        if (lower.includes(name) && !lower.includes(`than ${name}`))
          bad.push(`${id}: distractor ${i} names "${item}", which is not the answer`);
      });
    });
  }

  if (mode === 'order' && Array.isArray(q.items)) {
    const vals = q.items.map(x => Number(x[1])).filter(Number.isFinite);
    const sorted = [...vals].sort((a, b) => a - b);
    /* A RELATIVE gap only means anything on a ratio scale — twice the mass is
       twice the mass. Years are an interval scale: 1440 and 1608 are 10% apart
       by arithmetic and 168 years apart in fact, which is not a close call at
       all. Judge those by absolute distance instead. */
    const isYear = /year/i.test(q.unit || '') ||
      (sorted.length > 1 && sorted.every(v => v > 1000 && v < 2100));
    for (let i = 1; i < sorted.length; i++) {
      const lo = sorted[i - 1], hi = sorted[i];
      if (isYear) {
        if (hi - lo < 3) bad.push(`${id}: ${lo} and ${hi} are ${hi - lo} year(s) apart — too close to order confidently`);
      } else if (lo > 0 && (hi - lo) / hi < ORDER_MIN_GAP) {
        bad.push(`${id}: ${lo} and ${hi} are ${(100 * (hi - lo) / hi).toFixed(0)}% apart — too close to order confidently`);
      }
    }
    for (const d of new Set(dupes(vals))) bad.push(`${id}: two items share the value ${d}`);
  }

  return bad;
}

/** Run every question in every pool. @returns {string[]} */
export function validateAll(pools) {
  return Object.entries(pools).flatMap(([mode, pool]) =>
    pool.flatMap(q => validateQuestion(mode, q)));
}
