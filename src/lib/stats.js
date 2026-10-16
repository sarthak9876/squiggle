import { load } from './storage.js';

/* Self-comparison, which is what replaces the fake crowd.
   "Your best on this game: 92" is true, it needs no backend, and it is the number
   a returning player actually cares about. Computed from the answers already on
   disk — nothing new is stored. */
export function modeStats(mode) {
  const s = load();
  const all = Object.values(s.answers || {}).flat();
  const mine = all.filter(a => a && a.mode === mode && typeof a.score === 'number');
  if (!mine.length) return null;
  return {
    n: mine.length,
    best: Math.max(...mine.map(a => a.score)),
    mean: Math.round(mine.reduce((t, a) => t + a.score, 0) / mine.length),
  };
}
