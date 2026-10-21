/* localStorage, wrapped.
   It throws in private windows and in some embedded webviews. Every read and write
   is guarded so the game stays fully playable when storage is unavailable — you
   simply lose streaks, not the ability to play. */
import { BRAND } from '../brand.js';

const KEY = BRAND.storageKey;

/** Carry a save across the draw-id rename.
 *
 *  Draw The Curve's first fifteen questions had NUMERIC ids (1..15) while 16
 *  onwards were 'dr16'..'dr34' in the same array. Nothing broke — every
 *  comparison goes through String() — but it is the kind of trap that costs
 *  nothing now and a confusing afternoon the first time someone writes
 *  `ids.includes(id)` without it.
 *
 *  Renaming them strands ids already sitting in a player's saved practice
 *  queue. Without this the queue just rerolls, which is not a crash but does
 *  throw away five questions mid-run. Idempotent, and safe on any shape. */
export function migrateIds(state) {
  if (!state || typeof state !== 'object') return state;
  const fix = id => (typeof id === 'number' || /^\d+$/.test(String(id))) ? `dr${id}` : id;
  const out = { ...state };

  const saved = out.practice && out.practice.draw;
  if (saved && Array.isArray(saved.ids)) {   // Array.isArray already rejects every non-object shape
    out.practice = { ...out.practice, draw: { ...saved, ids: saved.ids.map(fix) } };
  }
  const last = out.lastPractice && out.lastPractice.draw;
  if (Array.isArray(last)) out.lastPractice = { ...out.lastPractice, draw: last.map(fix) };

  return out;
}

export function load() {
  try { return migrateIds(JSON.parse(localStorage.getItem(KEY)) || {}); } catch { return {}; }
}
export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* non-fatal */ }
}
export function patch(fn) {
  const s = load(); const next = fn(s) || s; save(next); return next;
}

/** A stable anonymous id. No account, no email — it exists only so this browser
 *  keeps getting this browser's question set. */
export function playerId() {
  const s = load();
  if (!s.pid) {
    s.pid = 'p' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    save(s);
  }
  return s.pid;
}

/** Merge this tab's in-progress answers with whatever is already stored.

    Two tabs share one storage key. patch() re-reads, so sibling keys survive,
    but the inflight VALUE was last-writer-wins: a tab left open on question 6
    wrote its shorter list over storage already holding 8, and the player watched
    a reload roll them backwards.

    Both tabs play the same lineup in the same order and a day's answers only
    ever grow, so length IS progress and the longer list wins. A stale tab's
    duplicate answer is dropped, which is correct — the other tab already
    recorded that question. Stored answers from a DIFFERENT day never apply. */
/** A banked day's answers, or null if there is nothing trustworthy there.
 *
 *  localStorage is shared, editable and survives every deploy, so the saved run
 *  is not always the shape the code expects. Reading it straight into state put
 *  junk where a list of scored answers belonged, and Results sums `b.score` on
 *  the first paint — inside App's OWN render, which is above the ErrorBoundary
 *  App returns. Nothing catches it, the page goes white, the bad value is still
 *  in storage, and every reload does it again: the game stops opening at all.
 *
 *  Checks the ELEMENTS, not just Array.isArray. `['played']` is an array. */
export function bankedAnswers(state, day) {
  const a = state && state.answers && state.answers[day];
  return Array.isArray(a) && a.length > 0
      && a.every(x => x && typeof x === 'object' && typeof x.score === 'number' && Number.isFinite(x.score))
    ? a : null;
}

/** Where a restored run picks up, derived from the answers themselves.
 *
 *  The position used to be restored as `Math.min(stored.idx, total - 1)`. After
 *  the last answer the stored idx equals `total`, so the clamp produced the LAST
 *  question again — with its answer already revealed — and answering it appended
 *  one more score than the run has questions. A day could bank 17 answers and a
 *  total over the 1600 maximum. Practice restored the same way.
 *
 *  `idx` was a second copy of a fact `answers.length` already holds, and two
 *  copies of one fact drift. This derives it, caps the answers at the number of
 *  questions, and treats a finished run as finished instead of re-opening it.
 *  Junk from a corrupted save resumes from the start rather than throwing. */
export function resumePoint(answers, total) {
  const safe = Array.isArray(answers) ? answers.slice(0, total) : [];
  return safe.length >= total
    ? { done: true, idx: Math.max(0, total - 1), answers: safe }
    : { done: false, idx: safe.length, answers: safe };
}

/** Today's saved run, resolved — or null if there isn't one.
 *
 *  The home label and the tap both needed this. After the label fix they at
 *  least shared resumePoint, but each still wrote its own
 *  `inflight && inflight.day === day` gate with its own total (SLOTS.length in
 *  one, lineup.length in the other). The VALUE was shared; the lookup around it
 *  was not — the same two-sources-of-truth shape one layer up, and the shape
 *  that produced the original bug. One function owns the whole fact now. */
export function inflightResume(state, day, total) {
  const f = state && state.inflight;
  if (!f || typeof f !== 'object' || f.day !== day) return null;
  return resumePoint(f.answers, total);
}

export function mergeInflight(stored, next, day) {
  const have = stored && stored.day === day ? (stored.answers || []) : [];
  const answers = next.length >= have.length ? next : have;
  return { day, idx: answers.length, answers };
}
