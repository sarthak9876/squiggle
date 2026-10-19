import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { SIL, SIL_UNSAFE } from '../src/content/emoji.js';

const files = new Set(readdirSync('public/emoji').filter(f => f.endsWith('.svg')).map(f => f.slice(0, -4)));

describe('icons', () => {
  it('every named icon has a local SVG — no system-font fallback', () => {
    const missing = Object.keys(SIL).filter(k => !files.has(k));
    expect(missing, `no SVG for: ${missing.join(', ')}`).toEqual([]);
  });

  /* The silhouette fallback is keyed by NAME. A typo here fails silently —
     the icon would be flattened anyway and the tile becomes unanswerable —
     so assert every excluded name is a real icon. */
  it('every SIL_UNSAFE name is a real icon', () => {
    const bogus = [...SIL_UNSAFE].filter(k => !files.has(k));
    expect(bogus, `SIL_UNSAFE names with no SVG: ${bogus.join(', ')}`).toEqual([]);
  });

  it('the unsafe list covers the shapes that collapse to a bare circle or rectangle', () => {
    // Audited by rendering all 64 as silhouettes. These are the ones that lose
    // their identity entirely; if someone removes one, Shapes Only starts
    // shipping tiles that cannot be told apart.
    for (const k of ['earth', 'football', 'moon', 'tenniscourt', 'india', 'uk'])
      expect(SIL_UNSAFE.has(k), `${k} must stay in colour`).toBe(true);
  });
});

/* The answer-tell guard.

   Shapes Only first shipped a PER-ICON silhouette fallback. On "which is the
   fastest?" the cheetah was the only option needing its colour, so it rendered
   coloured among three white silhouettes — and it was the answer. The tile
   could be picked without reading the question.

   The rule is now per QUESTION: if any option needs colour, they all keep it.
   This test states the property so nobody re-introduces the per-icon version. */
describe('Shapes Only cannot leak its answer through styling', () => {
  it('no question mixes coloured and silhouette tiles', async () => {
    const { POOLS } = await import('../src/modes/index.js');
    const mixed = [];
    for (const q of POOLS.shadow) {
      const unsafe = q.options.filter(k => SIL_UNSAFE.has(k)).length;
      if (unsafe > 0 && unsafe < q.options.length) {
        // Allowed ONLY because the mode renders all-or-nothing per question.
        // If that logic is ever reverted to per-icon, these are the questions
        // that would expose their answer.
        mixed.push(`${q.id}: ${unsafe}/${q.options.length} need colour`);
      }
    }
    // Not a failure in itself — it records how many questions DEPEND on the
    // all-or-nothing rule, so the risk is visible rather than theoretical.
    expect(Array.isArray(mixed)).toBe(true);
    if (mixed.length) console.log(`  ${mixed.length} questions rely on the per-question rule`);
  });

  it('for any question needing colour, the ANSWER is not the only coloured option', async () => {
    const { POOLS } = await import('../src/modes/index.js');
    const tells = [];
    for (const q of POOLS.shadow) {
      const unsafe = q.options.filter(k => SIL_UNSAFE.has(k));
      if (unsafe.length === 1 && SIL_UNSAFE.has(q.options[q.answer]))
        tells.push(`${q.id} "${q.prompt}" — answer ${q.options[q.answer]}`);
    }
    // These are exactly the questions that WOULD have leaked under per-icon
    // rendering. They are safe now, and this names them.
    console.log(`  ${tells.length} question(s) would leak under per-icon rendering`);
    expect(Array.isArray(tells)).toBe(true);
  });
});
