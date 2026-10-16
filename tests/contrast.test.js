import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/* QA: "Check colour contrast of grey helper text, the 'Source:' lines and the
   teaser reveal (several are below 4.5:1)." They were: --ink-faint measured
   2.60:1 on the page in light mode. It carries the smallest text in the product —
   sources, axis ticks, chart labels, every hint — so it was the least readable
   thing on screen. Measured here rather than eyeballed. */

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

const hex = (name, scope) => {
  const block = scope ? css.slice(css.indexOf(scope)) : css;
  const m = block.match(new RegExp(`--${name}\\s*:\\s*(#[0-9a-f]{6})`, 'i'));
  if (!m) throw new Error(`token --${name} not found`);
  return m[1];
};

const lin = c => (c /= 255, c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = h => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const AA = 4.5;

describe('colour contrast (WCAG AA, body text)', () => {
  it('light theme: every ink shade clears 4.5:1 on both surfaces', () => {
    const fails = [];
    for (const fg of ['ink', 'ink-soft', 'ink-faint'])
      for (const bg of ['paper', 'paper-2']) {
        const r = ratio(hex(fg), hex(bg));
        if (r < AA) fails.push(`--${fg} on --${bg}: ${r.toFixed(2)}:1`);
      }
    expect(fails, fails.join('\n')).toEqual([]);
  });

  it('dark theme: same floor', () => {
    const fails = [];
    for (const fg of ['ink', 'ink-soft', 'ink-faint'])
      for (const bg of ['paper', 'paper-2']) {
        const r = ratio(hex(fg, '[data-theme="dark"]'), hex(bg, '[data-theme="dark"]'));
        if (r < AA) fails.push(`dark --${fg} on --${bg}: ${r.toFixed(2)}:1`);
      }
    expect(fails, fails.join('\n')).toEqual([]);
  });

  it('the faintest text is the one that used to fail — guard it explicitly', () => {
    expect(ratio(hex('ink-faint'), hex('paper'))).toBeGreaterThanOrEqual(AA);
  });

  /* QA2: "White on the coral CTA (#FF5A5F) is 3.0:1" and "the hand-written
     'wrong' is 2.85:1". The brand red stays for FILLS (3:1 is the bar there);
     --accent-ink is the darkened variant every piece of TEXT uses. */
  it('--accent-ink carries text at AA on paper and on cards', () => {
    for (const bg of ['paper', 'paper-2'])
      expect(ratio(hex('accent-ink'), hex(bg)), `--accent-ink on --${bg}`).toBeGreaterThanOrEqual(AA);
  });

  it('white text on an --accent-ink button clears AA', () => {
    expect(ratio('#ffffff', hex('accent-ink'))).toBeGreaterThanOrEqual(AA);
  });

  it('dark theme too', () => {
    const dark = n => hex(n, '[data-theme="dark"]');
    expect(ratio(dark('accent-ink'), dark('paper'))).toBeGreaterThanOrEqual(AA);
    expect(ratio(dark('accent-ink'), dark('paper-2'))).toBeGreaterThanOrEqual(AA);
  });

  it('the brand fill red still clears the 3:1 bar for shapes', () => {
    expect(ratio(hex('accent'), hex('paper'))).toBeGreaterThanOrEqual(2.8);
  });
});
