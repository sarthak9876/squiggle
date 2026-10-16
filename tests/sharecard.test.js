import { describe, it, expect } from 'vitest';

/* The square grid was centred on a fixed eight-column width regardless of how many
   squares there were, so a 5-question card drew its row starting at the
   eight-column origin — visibly left of the score beneath it. Pure geometry, so
   it is testable without a canvas. */
const W = 1080, sq = 74, gap = 14;
const rowWidth = n => n * sq + (n - 1) * gap;

function rowCentres(count) {
  const cols = Math.min(8, count);
  const out = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, count - row * cols);
    out.push({ row, x: (W - rowWidth(inRow)) / 2 + (i % cols) * (sq + gap) });
  }
  return out;
}

describe('share card square grid', () => {
  const centred = count => {
    const cells = rowCentres(count);
    const byRow = new Map();
    for (const c of cells) (byRow.get(c.row) || byRow.set(c.row, []).get(c.row)).push(c.x);
    for (const [, xs] of byRow) {
      const left = Math.min(...xs), right = Math.max(...xs) + sq;
      // The row's midpoint must be the canvas midpoint.
      expect(Math.abs((left + right) / 2 - W / 2), `row off centre for ${count}`).toBeLessThan(1);
    }
  };

  it('centres a full 16-question run', () => centred(16));
  it('centres a 5-question practice run — the case that was off', () => centred(5));
  it('centres every run length from 1 to 16', () => {
    for (let n = 1; n <= 16; n++) centred(n);
  });
  it('a short final row is centred independently of the full row above it', () => {
    const cells = rowCentres(11);           // 8 then 3
    const top = cells.filter(c => c.row === 0).map(c => c.x);
    const bottom = cells.filter(c => c.row === 1).map(c => c.x);
    expect(Math.abs((Math.min(...top) + Math.max(...top) + sq) / 2 - W / 2)).toBeLessThan(1);
    expect(Math.abs((Math.min(...bottom) + Math.max(...bottom) + sq) / 2 - W / 2)).toBeLessThan(1);
    expect(Math.min(...bottom)).toBeGreaterThan(Math.min(...top));   // genuinely narrower
  });
});
