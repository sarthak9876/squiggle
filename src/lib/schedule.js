/* What you play, and when.

   Three guarantees, all of which were broken before:
     1. No question appears twice in the SAME day (by id, item-set or theme).
     2. No question repeats across days until its pool is exhausted.
     3. The archive never goes back before launch, and never leaks a question
        that is scheduled for a future day.

   The daily set flips at the player's LOCAL midnight — a game that resets at 3am
   for half the world does not feel daily. */
import { hash, shuffled } from './random.js';

export const EPOCH = new Date(2026, 0, 1);

/** Launch day. The archive starts here; earlier days do not exist. */
export const LAUNCH_DATE = new Date(2026, 9, 20);   // 20 Oct 2026

export function dayNumber(d = new Date()) {
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((midnight - EPOCH) / 86400000);
}
export const LAUNCH_DAY = dayNumber(LAUNCH_DATE);

/** The number players SEE. The internal day index counts from 1 Jan 2026 so the
 *  scheduler has a stable origin, but nobody wants to be told their first ever
 *  game is "Hunch #292" — launch day is #1.
 *  Before launch this is <= 0, so callers show "Preview" instead of a number. */
export function puzzleNumber(day) { return day - LAUNCH_DAY + 1; }

/** Label for any day, safe before launch. */
export function puzzleLabel(day) {
  const n = puzzleNumber(day);
  return n > 0 ? `#${n}` : 'Preview';
}

export function msUntilTomorrow(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next - now;
}
export function weekNumber(day) { return Math.floor((day + 4) / 7); }
export function dateOfDay(day) { return new Date(EPOCH.getTime() + day * 86400000); }

/* Two of each mode, interleaved so the same mechanic never runs twice in a row. */
export const SLOTS = [
  'shadow', 'size', 'groups', 'draw', 'place', 'share', 'odd', 'order',
  'size', 'shadow', 'groups', 'place', 'share', 'odd', 'order', 'draw',
];
export const PER_DAY = SLOTS.reduce((m, s) => ({ ...m, [s]: (m[s] || 0) + 1 }), {});

/** A question's visible signature — two questions showing the same tiles are the
 *  same question to a player, whatever their ids say. */
/** Every picture a question puts on screen. Two questions that both show a whale
 *  read as a repeat even when nothing else about them matches. */
export function emojiOf(mode, q) {
  switch (mode) {
    case 'shadow': return q.options || [];
    case 'size':   return [q.ref?.key, q.target?.key].filter(Boolean);
    case 'place':  return q.emoji ? [q.emoji] : [];
    case 'order':  return q.items.map(x => x[2]).filter(Boolean);
    default:       return q.emoji ? [q.emoji] : [];
  }
}

export function signatureOf(mode, q) {
  switch (mode) {
    case 'shadow': return [...q.options].sort().join('|');
    case 'odd':    return [...q.items].sort().join('|');
    case 'order':  return q.items.map(x => x[0]).sort().join('|');
    case 'groups': return q.groups.flatMap(g => g.items).sort().join('|');
    case 'size':   return q.ref.key + '~' + q.target.key;
    case 'place':  return q.item;
    default:       return String(q.id);
  }
}

/* ── The plan ──────────────────────────────────────────────────────────────
   Days are dealt in BLOCKS, not one at a time. Dealing a single day in isolation
   forces a choice between "no repeats across days" and "no theme collision inside
   a day": resolving a collision by walking the permutation forward skips a
   question, and a skipped question is a question served twice later. That is
   exactly the bug this replaces.

   Dealing a whole block at once removes the conflict. Each mode draws from a
   permutation of its pool; a question deferred from day 3 for a theme clash is
   still in the block's pile and gets dealt on day 4. Every question in the block
   is used exactly once, and each day still gets sixteen distinct themes.         */
const planCache = new Map();

/** The block IS the cycle: as many days as the thinnest pool supports. */
function blockLength(pools) {
  return Math.max(1, Math.min(...Object.entries(pools)
    .map(([m, p]) => Math.floor(p.length / (PER_DAY[m] || 1)))));
}

/* How many days either side of a block boundary must not share a question.
   Within a block nothing repeats at all; the gap only has to cover the seam. */
const SEAM = 5;

function dealBlock(pools, pid, block, mendSeam = true) {
  const BLOCK = blockLength(pools);
  const key = pid + ':' + block + ':' + BLOCK + ':' + (mendSeam ? 's' : 'r');
  if (planCache.has(key)) return planCache.get(key);

  // Each mode's pile for this block, in permutation order. Pools smaller than the
  // block's demand repeat whole permutations rather than part of one, so the
  // "every question once" property holds inside each permutation.
  const pile = {};
  for (const mode of Object.keys(pools)) {
    const pool = pools[mode], need = BLOCK * PER_DAY[mode];
    const list = [];
    for (let c = 0; list.length < need; c++)
      list.push(...shuffled(pool, hash(`${pid}:${mode}:${block}:${c}`)));
    pile[mode] = list.slice(0, Math.max(need, pool.length));
  }

  const days = [];
  for (let d = 0; d < BLOCK; d++) {
    const themes = new Set(), sigs = new Set(), ids = new Set(), pics = new Set();
    let india = 0;
    const day = [];
    for (const mode of SLOTS) {
      const list = pile[mode];
      const hard = q => !ids.has(q.id) && !sigs.has(signatureOf(mode, q)) && !themes.has(q.theme);
      // Picture clashes are a SOFT constraint: preferred, but never worth leaving a
      // slot empty or breaking the India quota for.
      const free = q => hard(q) && !emojiOf(mode, q).some(e => pics.has(e));
      // Prefer an India question whenever the day is still short of its quota, not
      // only when it becomes urgent — by then the remaining modes have often run
      // out of India options in this block's pile.
      let at = -1;
      if (india < MIN_INDIA) at = list.findIndex(q => free(q) && q.region === 'india');
      if (at < 0) at = list.findIndex(free);
      if (at < 0 && india < MIN_INDIA) at = list.findIndex(q => hard(q) && q.region === 'india');
      if (at < 0) at = list.findIndex(hard);
      if (at < 0) at = 0;
      const q = list.splice(at, 1)[0];
      ids.add(q.id); sigs.add(signatureOf(mode, q)); if (q.theme) themes.add(q.theme);
      for (const e of emojiOf(mode, q)) pics.add(e);
      if (q.region === 'india') india++;
      day.push({ mode, item: q });
    }
    days.push(day);
  }

  // ── Repair pass ──────────────────────────────────────────────────────────
  // Greedy dealing runs out of choices near the end of a cycle: by day 15 each
  // mode has two questions left and no say in their themes. Repair by SWAPPING
  // the same-mode question between two days — which fixes a collision without
  // changing which questions the block uses, so "every question once" survives.
  const themeOf = e => e.item.theme;
  const dayThemes = d => d.map(themeOf);
  const collisions = d => {
    const seen = new Set(), bad = [];
    d.forEach((e, i) => { if (seen.has(themeOf(e))) bad.push(i); else seen.add(themeOf(e)); });
    return bad;
  };

  for (let pass = 0; pass < 3; pass++) {
    let fixed = 0;
    for (let a = 0; a < days.length; a++) {
      for (const i of collisions(days[a])) {
        const mode = days[a][i].mode;
        // Find any other day whose same-slot question would sit happily here, and
        // whose own day is not made worse by taking ours.
        for (let b = 0; b < days.length && !0; b++) {
          if (b === a) continue;
          const j = days[b].findIndex((e, k) => e.mode === mode && k === i);
          if (j < 0) continue;
          const mine = days[a][i], theirs = days[b][j];
          const aOthers = dayThemes(days[a]).filter((_, k) => k !== i);
          const bOthers = dayThemes(days[b]).filter((_, k) => k !== j);
          if (aOthers.includes(theirs.item.theme)) continue;
          if (bOthers.includes(mine.item.theme)) continue;
          days[a][i] = theirs; days[b][j] = mine;
          fixed++;
          break;
        }
      }
    }
    if (!fixed) break;
  }

  // Same trick for the India quota: move an India question from a day that has
  // spare ones to a day that is short, swapping so both keep sixteen questions.
  const indiaCount = d => d.filter(e => e.item.region === 'india').length;
  for (let pass = 0; pass < 3; pass++) {
    let moved = 0;
    for (let a = 0; a < days.length; a++) {
      while (indiaCount(days[a]) < MIN_INDIA) {
        let done = false;
        for (let b = 0; b < days.length && !done; b++) {
          if (b === a || indiaCount(days[b]) <= MIN_INDIA) continue;
          for (let i = 0; i < days[a].length; i++) {
            if (days[a][i].item.region === 'india') continue;
            const j = i;
            if (days[b][j].item.region !== 'india') continue;
            const mine = days[a][i], theirs = days[b][j];
            const aOthers = dayThemes(days[a]).filter((_, k) => k !== i);
            const bOthers = dayThemes(days[b]).filter((_, k) => k !== j);
            if (aOthers.includes(theirs.item.theme)) continue;
            if (bOthers.includes(mine.item.theme)) continue;
            days[a][i] = theirs; days[b][j] = mine;
            moved++; done = true; break;
          }
        }
        if (!done) break;   // nothing left to trade — report honestly, do not loop
      }
    }
    if (!moved) break;
  }

  /* ── Seam repair ─────────────────────────────────────────────────────────
     Every guarantee above holds INSIDE a block. Across the boundary it did not:
     a question used on the last day of one cycle could reappear two days into the
     next, which to a daily player is simply a repeat. Pull the previous block's
     tail and push anything it used out of this block's opening days.

     `mendSeam: false` on the lookback is what stops this recursing backwards
     through every block that has ever existed — and for that lookback to be
     truthful, this repair must never modify a block's OWN last SEAM days. It
     only ever swaps an opening day with a MIDDLE day, so a block's tail is
     identical whether or not its seam was mended, and the previous block's tail
     read here is exactly the one players saw. */
  if (mendSeam && block > 0) {
    const prev = dealBlock(pools, pid, block - 1, false);
    const recent = new Set();
    for (const d of prev.slice(-SEAM))
      for (const e of d) recent.add(e.mode + ':' + signatureOf(e.mode, e.item));

    const sigOf = e => e.mode + ':' + signatureOf(e.mode, e.item);
    for (let a = 0; a < Math.min(SEAM, days.length); a++) {
      for (let i = 0; i < days[a].length; i++) {
        if (!recent.has(sigOf(days[a][i]))) continue;
        /* Swap with a day far enough into this block that the question lands
           well clear of the seam. Every mode owns TWO slots a day, and matching
           only the identical slot index halved the candidates for no reason —
           a Size It Up question is equally at home in either of its slots. */
        const mine = days[a][i];
        let done = false;
        for (let b = days.length - SEAM - 1; b >= SEAM && !done; b--) {
          for (let j = 0; j < days[b].length; j++) {
            const theirs = days[b][j];
            if (theirs.mode !== mine.mode || recent.has(sigOf(theirs))) continue;
            const aOthers = days[a].filter((_, k) => k !== i).map(e => e.item.theme);
            const bOthers = days[b].filter((_, k) => k !== j).map(e => e.item.theme);
            if (aOthers.includes(theirs.item.theme) || bOthers.includes(mine.item.theme)) continue;
            // Never trade away a day's India quota to fix a seam.
            const d1 = (theirs.item.region === 'india' ? 1 : 0) - (mine.item.region === 'india' ? 1 : 0);
            if (indiaCount(days[a]) + d1 < MIN_INDIA || indiaCount(days[b]) - d1 < MIN_INDIA) continue;
            days[a][i] = theirs; days[b][j] = mine;
            done = true; break;
          }
        }
      }
    }
  }

  planCache.set(key, days);
  return days;
}

/** How many India-relevant questions every daily set should contain. */
export const MIN_INDIA = 4;

/**
 * The day's sixteen questions.
 * Everyone gets the same SLOTS in the same order, so scores stay comparable; which
 * QUESTION lands in each slot depends on the player, so there is no answer key to
 * leak.
 */
export function lineupFor(pools, pid, day) {
  const BLOCK = blockLength(pools);
  const offset = day - LAUNCH_DAY;
  const b = Math.floor(offset / BLOCK);
  const idx = ((offset % BLOCK) + BLOCK) % BLOCK;
  return dealBlock(pools, pid, b)[idx];
}

/** How many days each game can run before it starts repeating. */
export function uniqueDays(pools) {
  const rows = Object.entries(pools).map(([mode, pool]) => ({
    mode, count: pool.length, perDay: PER_DAY[mode] || 1,
    days: Math.floor(pool.length / (PER_DAY[mode] || 1)),
  })).sort((a, b) => a.days - b.days);
  return { rows, days: rows[0]?.days ?? 0, thinnest: rows[0]?.mode };
}
