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
 *  game is "Squiggle #292" — launch day is #1.
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
    const byRegion = new Map();          // region -> how many already dealt today
    const day = [];
    for (const mode of SLOTS) {
      const list = pile[mode];
      const hard = q => !ids.has(q.id) && !sigs.has(signatureOf(mode, q)) && !themes.has(q.theme);
      // Picture clashes are a SOFT constraint: preferred, but never worth leaving a
      // slot empty.
      const free = q => hard(q) && !emojiOf(mode, q).some(e => pics.has(e));
      /* A day may carry at most MAX_PER_REGION questions from any ONE place.

         This replaces a quota that FORCED four India questions into every single
         day — a quarter of the set, for every player on earth, because the game
         was built in India. A player in Lagos or São Paulo met four questions
         about Indian states, rivers and cricket every day and could not opt out.

         The rule is deliberately region-agnostic: it caps whatever region tag a
         question carries, so adding Nigerian or Brazilian packs needs no change
         here. A question with no region is GLOBAL and is never capped, which is
         also why global questions are preferred when the cap is already met. */
      const capped = q => q.region && (byRegion.get(q.region) || 0) >= MAX_PER_REGION;
      /* Global questions come FIRST, even past a picture clash. Trying
         "no clash" before "no region" spent the regional allowance on days that
         had a perfectly good global question one slot further down the pile, and
         three days ended up over cap with nowhere left to trade. A repeated
         picture is a smaller sin than a day about one country. */
      let at = list.findIndex(q => free(q) && !q.region);
      if (at < 0) at = list.findIndex(q => hard(q) && !q.region);
      if (at < 0) at = list.findIndex(q => free(q) && !capped(q));
      if (at < 0) at = list.findIndex(q => hard(q) && !capped(q));
      // Only now relax the cap, rather than leave the slot empty.
      if (at < 0) at = list.findIndex(free);
      if (at < 0) at = list.findIndex(hard);
      if (at < 0) at = 0;
      const q = list.splice(at, 1)[0];
      ids.add(q.id); sigs.add(signatureOf(mode, q)); if (q.theme) themes.add(q.theme);
      for (const e of emojiOf(mode, q)) pics.add(e);
      if (q.region) byRegion.set(q.region, (byRegion.get(q.region) || 0) + 1);
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

  /* Same trick for region balance, but the other way round: move a region
     question OFF a day that carries more than the cap, onto a day that has room.
     This used to top days UP to a four-question India floor. */
  const regionCount = (d, r) => d.filter(e => e.item.region === r).length;
  const overCap = d => {
    const seen = new Map();
    for (const e of d) if (e.item.region) seen.set(e.item.region, (seen.get(e.item.region) || 0) + 1);
    for (const [r, n] of seen) if (n > MAX_PER_REGION) return r;
    return null;
  };
  for (let pass = 0; pass < 3; pass++) {
    let moved = 0;
    for (let a = 0; a < days.length; a++) {
      let over;
      while ((over = overCap(days[a]))) {
        let done = false;
        for (let b = 0; b < days.length && !done; b++) {
          if (b === a || regionCount(days[b], over) >= MAX_PER_REGION) continue;
          for (let i = 0; i < days[a].length; i++) {
            if (days[a][i].item.region !== over) continue;
            const j = i;
            // Trading for another question of the same region solves nothing.
            if (days[b][j].item.region === over) continue;
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
            // Never push a day OVER the region cap just to fix a seam.
            if (theirs.item.region && theirs.item.region !== mine.item.region
                && regionCount(days[a], theirs.item.region) >= MAX_PER_REGION) continue;
            if (mine.item.region && mine.item.region !== theirs.item.region
                && regionCount(days[b], mine.item.region) >= MAX_PER_REGION) continue;
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

/** How many questions from any ONE region a single day may carry.

    Was MIN_INDIA = 4 — a floor that forced a quarter of every day to be about
    one country. This is a CEILING instead, and it applies to every region
    equally. Untagged questions are global and uncapped. */
export const MAX_PER_REGION = 1;

/* The global salt. Changing it reshuffles the entire schedule for everyone, so it
   is a one-way door once the game is live — it exists so the question order is not
   trivially derivable from the day number alone, nothing more. */
const SALT = 'squiggle-daily-v1';

/**
 * The day's sixteen questions — THE SAME SIXTEEN FOR EVERY PLAYER.
 *
 * This used to be seeded per browser so there would be no answer key to leak. That
 * was the wrong trade. A daily game spreads because two people can say "did you get
 * the whale one?" — per-player sets kill the shared score, make the emoji grid
 * meaningless between friends, and made the challenge card's promise ("they get
 * today's exact set") simply false. Wordle and every game like it accept the
 * spoiler risk, because the conversation IS the distribution.
 *
 * `pid` is still accepted so callers need not change, but it is deliberately
 * ignored here. Practice mode keeps using it for per-player variety.
 */
export function lineupFor(pools, _pid, day) {
  const BLOCK = blockLength(pools);
  const offset = day - LAUNCH_DAY;
  const b = Math.floor(offset / BLOCK);
  const idx = ((offset % BLOCK) + BLOCK) % BLOCK;
  return dealBlock(pools, SALT, b)[idx];
}

/** How many days each game can run before it starts repeating. */
export function uniqueDays(pools) {
  /* The cycle is as long as the bank can fill it FAIRLY, which is not the same
     as how many questions it holds.

     A day may carry at most MAX_PER_REGION region-tagged questions, so over D
     days the scheduler can use every global question plus roughly D region ones.
     Counting the whole pool gave 21 days — but only because a quarter of every
     day was forced to be India. With the cap in place, asking for 21 days makes
     the greedy dealer spend the global pool first and then dump nine, ten, twelve
     India questions into the final days, which is worse than a shorter cycle.

     So each mode's reach is its GLOBAL questions, plus the share of the regional
     allowance it can expect. Shorter and honest beats longer and lopsided. */
  const rows = Object.entries(pools).map(([mode, pool]) => {
    const perDay = PER_DAY[mode] || 1;
    const global = pool.filter(q => !q.region).length;
    // Region questions arrive at MAX_PER_REGION per day across ALL slots, so one
    // mode can count on roughly its slot-share of them.
    /* Counting the regional allowance as extra reach left the first and last two
       days still over cap — the greedy dealer cannot see the end coming, and by
       the final day every other day is full so the repair pass has nowhere to
       trade to. Each mode is therefore sized on its GLOBAL questions alone: a
       region question then merely REPLACES a global one, which is always
       feasible. Shorter, and provably fair on every day. */
    const days = Math.floor(global / perDay);
    return { mode, count: pool.length, global, perDay, days };
  }).sort((a, b) => a.days - b.days);
  return { rows, days: rows[0]?.days ?? 0, thinnest: rows[0]?.mode };
}
