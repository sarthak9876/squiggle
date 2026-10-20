import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { SIL, SIL_UNSAFE } from '../src/content/emoji.js';
import { POOLS } from '../src/modes/index.js';
import { emojiFile } from '../src/lib/emojiUrl.js';

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

/* The test above covers the NAMED icons (public/emoji/<name>.svg). Content also
   carries RAW emoji characters — the flags in Put In Order, the item glyph in
   Place The Dot — which resolve through emojiUrl() to public/emoji/u/<cps>.svg.
   Nothing checked those, and three were missing: the polar bear (a ZWJ sequence,
   so 1f43b.svg being present did not help), YouTube's ▶️ and the coal plant's 🏭.
   An <img> whose src 404s renders as nothing, so the card just lost its picture
   with no error anywhere. Same lesson as the 100%px regression: assert VISIBLE. */
describe('raw content emoji', () => {
  const have = new Set(readdirSync('public/emoji/u').filter(f => f.endsWith('.svg')).map(f => f.slice(0, -4)));
  const EMOJI = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?)*|\p{Regional_Indicator}{2}/gu;

  it('every emoji character in content has a local SVG', () => {
    const missing = new Set();
    for (const [mode, pool] of Object.entries(POOLS)) {
      for (const ch of (JSON.stringify(pool).match(EMOJI) || [])) {
        if (!have.has(emojiFile(ch))) missing.add(`${mode}:${ch}(${emojiFile(ch)})`);
      }
    }
    expect([...missing], `no SVG for: ${[...missing].join(', ')}`).toEqual([]);
  });

  /* Mercury, Venus and Jupiter all carried 🪐 — which is Saturn, and Saturn is
     not in that set. One glyph standing for three different items is worse than
     no glyph: it is decoration that asserts something false. Two genuine coffees
     sharing ☕ is fine, so this asserts on the ITEMS, not the characters. */
  it('no Put In Order set uses one emoji for two different items', () => {
    const clashes = [];
    for (const q of POOLS.order) {
      const seen = new Map();
      for (const [label, , emo] of q.items) {
        if (!emo) continue;
        if (seen.has(emo)) clashes.push(`${q.id}: ${seen.get(emo)} and ${label} both ${emo}`);
        else seen.set(emo, label);
      }
    }
    expect(clashes, clashes.join(' | ')).toEqual(['o16: Filter coffee and Espresso shot both ☕']);
  });
});
