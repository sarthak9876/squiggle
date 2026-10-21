/* What you play, and when.

   Three guarantees, all of which were broken before:
     1. No question appears twice in the SAME day (by id, item-set or theme).
     2. No question repeats across days until its pool is exhausted.
     3. The archive never goes back before launch, and never leaks a question
        that is scheduled for a future day.

   The daily set flips at the player's LOCAL midnight — a game that resets at 3am
   for half the world does not feel daily. */
import { hash, shuffled } from './random.js';

/* UTC, deliberately. A day NUMBER is a calendar fact shared by every player, so
   it must not be computed from local wall-clock arithmetic — a local day is 23
   or 25 hours long twice a year, and dividing by 86,400,000 drifted. See
   tests/dst.test.js for the three symptoms that produced. */
export const EPOCH = new Date(Date.UTC(2026, 0, 1));

/** Launch day. The archive starts here; earlier days do not exist. */
export const LAUNCH_DATE = new Date(2026, 9, 20);   // 20 Oct 2026

export function dayNumber(d = new Date()) {
  /* Read the player's LOCAL calendar date — their midnight is when the puzzle
     turns over — then measure it on the UTC grid, where every day is exactly
     86,400,000 ms. Local in, UTC arithmetic: the date is theirs, the number is
     everyone's. Math.round, not floor: the quotient is a whole number by
     construction, and floor is what turned a 23-hour day into a lost one. */
  return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH.getTime()) / 86400000);
}
export const LAUNCH_DAY = dayNumber(LAUNCH_DATE);

/** The number players SEE. The internal day index counts from 1 Jan 2026 so the
 *  scheduler has a stable origin, but nobody wants to be told their first ever
 *  game is "Squiggle #292" — launch day is #1.
 *  Before launch this is <= 0, so callers show "Preview" instead of a number. */
export function puzzleNumber(day) { return day - LAUNCH_DAY + 1; }

/** May the archive offer this day?
 *
 *  ONE rule with two callers — the Archive's list and the route guard that opens
 *  a day. They used to carry separate copies and the copies disagreed: the list
 *  started at `today` and the guard allowed `d === day`, so today's set was
 *  playable in the archive. Archive runs never count towards the streak, so a
 *  player could read all sixteen answers there and then play the daily knowing
 *  every one — two taps, and the streak and best score stop meaning anything.
 *
 *  Today is the DAILY. The archive is the past, and the past ends yesterday. */
export function isArchiveDay(d, today = dayNumber()) {
  return Number.isInteger(d) && d >= LAUNCH_DAY && d < today;
}

/** What arriving on /play should open.
 *
 *  Two effects used to answer this. The challenge effect called setLineup for
 *  the challenged day; the route resolver a few lines later said
 *  `else if (route.name === 'play' && !lineup) startDaily()`. Both run in the
 *  SAME commit and both read `lineup === null` from that render, so the
 *  resolver always won: a link for day 292 dealt day 293's sixteen, under a
 *  banner that correctly said "scored 1500 on set #1". The banner was right and
 *  the questions were wrong.
 *
 *  One answer now, and a pure one, so it is testable without React. */
export function playRouteTarget(challenge, today = dayNumber()) {
  if (challenge && !challenge.forToday && isArchiveDay(challenge.day, today)) {
    return { kind: 'archive', day: challenge.day };
  }
  return { kind: 'daily' };
}

/** Every day the archive may offer, newest first. Empty on launch day. */
export function archiveDays(today = dayNumber()) {
  const out = [];
  for (let d = today - 1; d >= LAUNCH_DAY; d--) out.push(d);
  return out;
}

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

/** What banking `day` does to a streak. The ONE copy of this arithmetic.
 *
 *  It used to live in bankDay alone, and the home screen made its own simpler
 *  guess — alive only if you played today or yesterday — which contradicted the
 *  insurance rule it did not know about. A player who missed one day was told
 *  "Streak lost" and then had the streak quietly continued when they played.
 *
 *  The old `else` branch also caught a gap of zero or less, so flying west over
 *  the dateline — or a device clock going back — wiped a streak for playing on
 *  a day that had already happened. */
export function streakAfter(state, day) {
  const { streak = 0, lastDay = null, insuranceWeek = null } = state || {};
  if (!Number.isInteger(lastDay)) return { streak: 1, lastDay: day, insuranceWeek };

  const gap = day - lastDay;
  // Already happened. Hold everything: moving lastDay backwards breaks tomorrow.
  if (gap <= 0) return { streak, lastDay, insuranceWeek };
  if (gap === 1) return { streak: streak + 1, lastDay: day, insuranceWeek };
  /* One free missed day a week, applied silently. A freeze you have to remember
     to claim does not work — by then you have already felt the loss. */
  if (gap === 2 && insuranceWeek !== weekNumber(day)) {
    return { streak: streak + 1, lastDay: day, insuranceWeek: weekNumber(day) };
  }
  return { streak: 1, lastDay: day, insuranceWeek };
}

/** Is the streak on the home screen still alive? Defined as "banking today
 *  would not throw progress away", and ASKED OF streakAfter rather than
 *  reimplemented, so the screen and the rule cannot drift apart again.
 *
 *  Not `after.streak > 1`: a player on day one who has already played today has
 *  a live streak of exactly 1, and that test would have called it lost. */
export function streakIsAlive(state, day) {
  const lastDay = state && state.lastDay;
  if (!Number.isInteger(lastDay)) return false;
  const before = (state && state.streak) || 0;
  return !(streakAfter(state, day).streak === 1 && before > 1);
}
/** The UTC-midnight Date for a day number. Format it with `timeZone: 'UTC'` —
 *  rendering it in a negative-offset zone would show the previous date. */
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
   Within a block nothing repeats at all, so this only has to cover the seam.

   It was 5 and it did not work — measured over a year, a question could come
   back the NEXT DAY. Two things were wrong: the lookback compared against an
   unmended copy of the previous block that no player was ever shown (see
   `recent` below), and the avoidance was a soft preference that fell straight
   through to tiers ignoring it.

   7 was picked by measurement, not taste. Over 365 days, with the thinnest mode
   holding 33 questions at 2 a day:
     SEAM  min gap   repeats under 8 days
       5      6             260
       7      5               5
       8      2               2
       9      1               6
      11      1              37
   7 is the largest value that still holds a floor under every seam. Past it the
   opening days cannot find enough unseen questions and fall through to the
   fallback, so the WORST case gets worse even as the average improves — and a
   player notices the question they saw on Tuesday, not the distribution. */
const SEAM = 7;

function dealBlock(pools, pid, block) {
  const BLOCK = blockLength(pools);
  const key = pid + ':' + block + ':' + BLOCK;
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

  /* What the previous block actually ENDED on.

     This used to read dealBlock(block - 1, mendSeam=false) — an UNMENDED copy —
     to stop the lookback recursing backwards for ever, and justified it with a
     comment claiming a block's tail is the same either way. That was never
     enforced, and it is not true: dealing is sequential and splices from a
     shared pile, so what the opening days take changes what is left for the
     tail. The lookback was comparing against a schedule nobody was ever shown,
     which is why a question could come back the very next day.

     Blocks are deterministic and cached, so just recurse honestly. Reaching day
     N costs N/BLOCK block builds ONCE, and every one after that is a cache hit.
     The archive never goes back past LAUNCH_DAY, so the chain is short. */
  const recent = new Set();
  if (block > 0) {
    for (const d of dealBlock(pools, pid, block - 1).slice(-SEAM))
      for (const e of d) recent.add(e.mode + ':' + e.item.id);
  }

  /* Deal the LATER days first, then the opening ones.

     The seam fix needs to know what the previous block ended on, and it reads
     that from dealBlock(block - 1, FALSE) so the lookback cannot recurse
     backwards through every block that ever existed. That is only truthful if a
     block's tail is the same whether or not its own seam was mended — the code
     used to claim exactly that in a comment, and the claim was false: dealing is
     sequential and splices from a shared pile, so changing which questions the
     OPENING days take changes what is left for every day after them, tail
     included.

     Dealing days SEAM..BLOCK-1 before days 0..SEAM-1 makes it true instead of
     asserted. The tail is drawn from a pile that has never seen the opening
     days, so it does not depend on `recent` at all, and the lookback reads
     exactly the questions the player was shown. */
  const days = new Array(BLOCK);
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
      /* Inside the opening days, a question the previous block just used is the
         worst available choice — to a daily player it is simply a repeat. Try
         every other combination first and only fall through if nothing fits. */
      const fresh = q => d >= SEAM || !recent.has(mode + ':' + q.id);
      let at = list.findIndex(q => fresh(q) && free(q) && !q.region);
      if (at < 0) at = list.findIndex(q => fresh(q) && hard(q) && !q.region);
      if (at < 0) at = list.findIndex(q => fresh(q) && free(q) && !capped(q));
      if (at < 0) at = list.findIndex(q => fresh(q) && hard(q) && !capped(q));
      /* Exhaust EVERY unseen question before reaching for one the player saw a
         few days ago. Repeating a theme inside a day is a far smaller sin than
         repeating a QUESTION across the seam, which reads as the generator being
         broken — and it was: the fresh tiers above used to fall straight through
         to these, so a question could return the very next day. */
      if (at < 0) at = list.findIndex(q => fresh(q) && free(q));
      if (at < 0) at = list.findIndex(q => fresh(q) && hard(q));
      if (at < 0) at = list.findIndex(fresh);
      if (at < 0) at = list.findIndex(q => free(q) && !q.region);
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
    days[d] = day;
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
