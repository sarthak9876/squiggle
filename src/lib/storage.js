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
export function mergeInflight(stored, next, day) {
  const have = stored && stored.day === day ? (stored.answers || []) : [];
  const answers = next.length >= have.length ? next : have;
  return { day, idx: answers.length, answers };
}
