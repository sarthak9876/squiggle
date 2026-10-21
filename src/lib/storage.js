/* localStorage, wrapped.
   It throws in private windows and in some embedded webviews. Every read and write
   is guarded so the game stays fully playable when storage is unavailable — you
   simply lose streaks, not the ability to play. */
import { BRAND } from '../brand.js';

const KEY = BRAND.storageKey;

export function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
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

export function mergeInflight(stored, next, day) {
  const have = stored && stored.day === day ? (stored.answers || []) : [];
  const answers = next.length >= have.length ? next : have;
  return { day, idx: answers.length, answers };
}
