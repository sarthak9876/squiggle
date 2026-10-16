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
