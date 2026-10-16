/* Deterministic randomness.
   Nothing that varies may use Math.random(): a player who reloads must get the same
   questions back, and a bot must not re-roll a better score when you look away.
   Every variable thing in this game derives from a seed. */

/** FNV-1a — fast, well-distributed, and stable across engines. */
export function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** mulberry32 — a 32-bit PRNG good enough for shuffling and cheap enough to inline. */
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded Fisher-Yates. Returns a new array; never mutates the input. */
export function shuffled(arr, seed) {
  const a = arr.slice(), r = rng(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick n items without replacement, deterministically. */
export function sample(arr, n, seed) {
  return shuffled(arr, seed).slice(0, Math.min(n, arr.length));
}
