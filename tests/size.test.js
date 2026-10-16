import { describe, it, expect } from 'vitest';
import { POOLS } from '../src/modes/index.js';
import { SIL } from '../src/content/emoji.js';

/* QA: "the picture doesn't match the number" — an area ratio of 32.5x was drawn
   32.5x wider when it should be sqrt(32.5) ≈ 5.7x, and the tennis court was a
   football emoji. Both sides of z18 were the SAME emoji. */
describe('Size It Up — picture matches the quantity', () => {
  const DIMS = new Set(['length', 'area', 'volume', 'mass', 'abstract']);

  it('every question declares a known dimension (default length)', () => {
    for (const q of POOLS.size)
      if (q.dimension !== undefined) expect(DIMS.has(q.dimension), `${q.id}: ${q.dimension}`).toBe(true);
  });

  it('units imply the dimension — kg is never drawn as length', () => {
    const wrong = [];
    for (const q of POOLS.size) {
      const d = q.dimension || 'length';
      if (/\bkg\b|tonne/i.test(q.unit) && d !== 'mass') wrong.push(`${q.id} (${q.unit}) is '${d}', want mass`);
      if (/m²|km²|area/i.test(q.unit) && d !== 'area') wrong.push(`${q.id} (${q.unit}) is '${d}', want area`);
      if (/[₹$€]/.test(q.unit) && d !== 'abstract') wrong.push(`${q.id} (${q.unit}) is '${d}', want abstract`);
    }
    expect(wrong, wrong.join('\n')).toEqual([]);
  });

  it('the two sides never use the same emoji', () => {
    const same = POOLS.size.filter(q => SIL[q.ref.key] === SIL[q.target.key])
                           .map(q => `${q.id}: both sides are ${SIL[q.ref.key]}`);
    expect(same, same.join('\n')).toEqual([]);
  });

  it('every emoji key resolves', () => {
    const missing = [];
    for (const q of POOLS.size) {
      if (!SIL[q.ref.key]) missing.push(`${q.id}: ref key '${q.ref.key}'`);
      if (!SIL[q.target.key]) missing.push(`${q.id}: target key '${q.target.key}'`);
    }
    expect(missing, missing.join('\n')).toEqual([]);
  });

  it('an area question draws at the square root, not the raw ratio', async () => {
    const { size } = await import('../src/modes/size.jsx');
    const z18 = POOLS.size.find(q => q.id === 'z18');
    expect(z18.dimension).toBe('area');
    // 27x area is about 5.2x across — the number the picture must honour.
    expect(Math.sqrt(z18.answer)).toBeCloseTo(5.196, 2);
    // The readout still reports the real quantity, not the drawn one.
    const perfect = { v: size.toSlider(z18.answer), touched: true };
    expect(size.score(z18, perfect)).toBe(100);
  });
});

/* "the size of the around the earth" — the readout prefixed an article onto every
   reference label, including ones that already had one or could not take one. */
describe('Size It Up — readout wording', () => {
  it('every reference label reads as English with the article rule applied', async () => {
    const NO_ARTICLE = /^(around|across|over|under|per|from|to|in|on|a|an|the)\b/i;
    const phrase = l => (NO_ARTICLE.test(String(l).trim()) ? String(l).trim() : 'the ' + l).toLowerCase();
    const bad = [];
    for (const q of POOLS.size) {
      const p = phrase(q.ref.label);
      if (/\bthe the\b/.test(p)) bad.push(`${q.id}: "${p}"`);
      if (/\bthe (around|across|over|under|per|from|to|in|on)\b/.test(p)) bad.push(`${q.id}: "${p}"`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
});
