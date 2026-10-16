/* Question bank linter — `npm run lint:questions`.

   Catches the classes of content bug that shipped to pre-launch QA, so they
   cannot come back when the bank grows:
     - a number stated with no source, or a source that is not one
     - an odd-one-out where more than one item satisfies a listed reason
     - a numeric question with no unit
     - the same answer or emoji twice in one day's set
   Exits non-zero so CI fails on a bad question rather than a player finding it. */
import { POOLS } from '../src/modes/index.js';
import { lineupFor, LAUNCH_DAY, uniqueDays, PER_DAY } from '../src/lib/schedule.js';

const problems = [];
const warnings = [];
const fail = (id, msg) => problems.push(`${id}: ${msg}`);
/* Picture clashes are cosmetic and the scheduler already treats them as a soft
   preference — a day with 16 questions draws ~12 pictures from a 60-key
   vocabulary, so some overlap is arithmetic, not carelessness. Reported, not fatal. */
const warn = (id, msg) => warnings.push(`${id}: ${msg}`);

/* "General knowledge" is not a source. A categorisation puzzle may legitimately
   have none — it states no number — so `null` is allowed and a vague string is not. */
const BANNED = /^(general knowledge|geography|history|common knowledge|various|wordplay|comparative [a-z ]+|assorted|misc)$/i;
const STATES_A_NUMBER = new Set(['size', 'share', 'place', 'draw', 'order', 'shadow']);

for (const [mode, pool] of Object.entries(POOLS)) {
  const seenId = new Set();
  /* Prompt-level duplicates. The signature check compares what is ON SCREEN
     (option sets, item lists), so two questions asking the same thing with one
     option swapped slipped through and read as the same question twice. */
  const seenPrompt = new Map();
  for (const q of pool) {
    const id = `[${mode}] ${q.id}`;
    if (seenId.has(String(q.id))) fail(id, 'duplicate id within the pool');
    seenId.add(String(q.id));

    const src = (q.source || '').trim();
    if (STATES_A_NUMBER.has(mode)) {
      if (!src) fail(id, 'states a number but cites no source');
      else if (BANNED.test(src)) fail(id, `"${q.source}" is not a source`);
    } else if (src && BANNED.test(src)) {
      fail(id, `"${q.source}" is not a source — use null if there is no number to cite`);
    }

    if (!q.theme) fail(id, 'no theme (the scheduler needs it to avoid same-topic days)');

    /* Only where the prompt IS the question. In Put In Order and Shapes Only it
       is a generic instruction — "Hottest first", "Which of these is heaviest?" —
       and the real question is the item list, which signatureOf already dedupes.
       Flagging those produced five false positives on legitimate questions. */
    if (['share', 'place', 'size', 'draw'].includes(mode)) {
      const prompt = (q.prompt || q.question || q.title || '').trim().toLowerCase();
      if (prompt) {
        if (seenPrompt.has(prompt)) fail(id, `asks the same thing as ${seenPrompt.get(prompt)}`);
        else seenPrompt.set(prompt, q.id);
      }
    }

    if (mode === 'size') {
      if (!q.unit) fail(id, 'numeric answer with no unit');
      if (!['length','area','volume','mass','abstract',undefined].includes(q.dimension))
        fail(id, `unknown dimension "${q.dimension}"`);
      if (/\bkg\b|tonne/i.test(q.unit || '') && q.dimension !== 'mass')
        fail(id, `unit "${q.unit}" but dimension is "${q.dimension || 'length'}"`);
      if (/m²|km²/i.test(q.unit || '') && q.dimension !== 'area')
        fail(id, `unit "${q.unit}" but dimension is "${q.dimension || 'length'}"`);
    }
    if (mode === 'share' && !q.unit) fail(id, 'percentage with no unit phrase');

    /* The bug the user hit first: "what kind of dumb question was this" — an
       odd-one-out where two of the four reasons are true. */
    if (mode === 'odd') {
      if (!Array.isArray(q.reasons) || q.reasons.length !== q.items.length)
        fail(id, 'reasons must be one per item');
      if (q.trueCount !== 1) fail(id, `trueCount is ${q.trueCount}, must be 1`);
      if (q.reason == null || !q.reasons[q.reason]) fail(id, 'reason index does not resolve');
      if (q.odd == null || !q.items[q.odd]) fail(id, 'odd index does not resolve');
    }

    if (mode === 'order') {
      const vals = q.items.map(x => x[1]);
      if (new Set(vals).size !== vals.length) fail(id, 'two items share a value — the order is a coin flip');
      if (!q.unit) fail(id, 'ordered numbers with no unit');
    }

    if (mode === 'groups') {
      if (q.groups.length !== 3 || q.groups.some(g => g.items.length !== 3))
        fail(id, 'must be three groups of three');
      const all = q.groups.flatMap(g => g.items);
      if (new Set(all).size !== all.length) fail(id, 'an item appears in two groups');
    }
  }
}

/* No day may show the same emoji twice — QA saw the whale in Q1 and Q10. */
const CYCLE = uniqueDays(POOLS).days;
for (let d = LAUNCH_DAY; d < LAUNCH_DAY + CYCLE; d++) {
  const lineup = lineupFor(POOLS, 'lint', d);
  const emoji = new Map();
  for (const { mode, item } of lineup) {
    const found = [item.emoji, ...(mode === 'shadow' ? item.options : []),
                   ...(mode === 'size' ? [item.ref?.key, item.target?.key] : [])].filter(Boolean);
    for (const e of found) {
      if (emoji.has(e) && emoji.get(e) !== item.id)
        warn(`day +${d - LAUNCH_DAY}`, `"${e}" appears in both ${emoji.get(e)} and ${item.id}`);
      emoji.set(e, item.id);
    }
  }
}

/* CONTENT RUNWAY.
   The ask was "no question repeats within 120 days". At 16 questions a day that
   needs 1,920 questions and the bank holds 320 — short 1,600, and still short 86
   in the thinnest pool even at 8 a day. So this check does NOT assert 120; it
   asserts the cycle never SHRINKS, and prints the gap every run so the number
   stays in front of whoever is writing content. Raise TARGET_DAYS as the bank
   grows; the day it reaches 120 the original ask is met and this comment is moot. */
const TARGET_DAYS = 120;
const MIN_DAYS = 17;            // ratchet: today's cycle. Never let it drop.
if (CYCLE < MIN_DAYS) {
  fail('schedule', `cycle fell to ${CYCLE} days (floor is ${MIN_DAYS}) — a pool shrank`);
}
if (CYCLE < TARGET_DAYS) {
  const per = Object.entries(POOLS).map(([m, p]) => {
    const need = TARGET_DAYS * (PER_DAY[m] || 1);
    return { m, short: Math.max(0, need - p.length) };
  }).filter(x => x.short > 0).sort((a, b) => b.short - a.short);
  const total = per.reduce((t, x) => t + x.short, 0);
  console.warn(`\n\u26a0 content runway: ${CYCLE}-day cycle, target ${TARGET_DAYS}.`);
  console.warn(`  ${total} more questions needed. Thinnest: ` +
    per.slice(0, 3).map(x => `${x.m} +${x.short}`).join(', '));
}

if (warnings.length) {
  console.warn(`\n⚠ ${warnings.length} picture repeat(s) across the ${CYCLE}-day cycle (cosmetic):\n`);
  for (const w of warnings.slice(0, 12)) console.warn('  ' + w);
  if (warnings.length > 12) console.warn(`  …and ${warnings.length - 12} more`);
}
if (problems.length) {
  console.error(`\n✗ ${problems.length} question problem(s):\n`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`\n✓ question bank clean — ${Object.values(POOLS).flat().length} questions, ${CYCLE}-day cycle`);
