import { load } from './storage.js';

/* Self-comparison, which is what replaces the fake crowd.
   "Your best on this game: 92" is true, it needs no backend, and it is the number
   a returning player actually cares about. Computed from the answers already on
   disk — nothing new is stored. */
/**
 * @param mode      which game
 * @param inFlight  today's answers, which are NOT yet in storage. Without them
 *                  the card could read "Your best on this game 75" directly under
 *                  a score of 96 — because `best` only ever saw saved days.
 * @param excludeLast  drop the most recent in-flight answer, so "best" means
 *                  "your best BEFORE this one" and a new record is detectable.
 */
export function modeStats(mode, inFlight = [], excludeLast = false) {
  const s = load();
  const saved = Object.values(s.answers || {}).flat();
  let live = inFlight.filter(a => a && a.mode === mode && typeof a.score === 'number');
  if (excludeLast && live.length) live = live.slice(0, -1);
  const mine = [...saved.filter(a => a && a.mode === mode && typeof a.score === 'number'), ...live];
  if (!mine.length) return null;
  return {
    n: mine.length,
    best: Math.max(...mine.map(a => a.score)),
    mean: Math.round(mine.reduce((t, a) => t + a.score, 0) / mine.length),
  };
}
