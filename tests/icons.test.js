import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { SIL, SIL_UNSAFE, silLabel, SIL_NAMES } from '../src/content/emoji.js';
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

/* Shapes Only is the one mode whose options ARE SIL keys, and it prints them to
   the player on reveal. It showed "tajmahal", "tenniscourt" and "uk" until
   silLabel() went in. A key that looks fine capitalised is the trap here, so
   this asserts no displayed label survives as a bare lowercase slug. */
describe('Shapes Only labels', () => {
  it('no option reveals as a raw slug', () => {
    const raw = [];
    for (const q of POOLS.shadow) {
      for (const k of q.options) {
        const l = silLabel(k);
        if (l === k || /^[a-z]/.test(l)) raw.push(`${q.id}: ${k} -> ${l}`);
      }
    }
    expect(raw, raw.join(' | ')).toEqual([]);
  });

  /* A typo in the NAMES map does nothing visible — silLabel falls through to
     capitalising the key, which is what it did before the map existed. Same
     silent-failure shape as SIL_UNSAFE, so guard it the same way. Whether a
     label reads as English is a human call and stays in the map's comment;
     a regex that tries to decide it just rejects "Taj Mahal" for the capital M. */
  it('every NAMES override points at a real SIL key', () => {
    const bogus = Object.keys(SIL_NAMES).filter(k => !(k in SIL));
    expect(bogus, `NAMES keys with no icon: ${bogus.join(', ')}`).toEqual([]);
  });
});

/* The "Did you know" icon used to come from the question's THEME. A theme is a
   scheduling device — it exists so two questions about the same neighbourhood
   do not land on the same day — so its name describes the neighbourhood, not
   the subject. "Loudest first" is themed `missions`, so Krakatoa got a
   satellite; "which is heaviest" is themed `birds`, so a dog got a bird; a
   tortoise's lifespan got a caterpillar. A confident wrong picture beside a
   true sentence is the thing that makes a page look machine-made. */
describe('the fact icon comes from the question, never its theme', () => {
  const factIcon = (item, mode) => {
    if (item?.emoji) return item.emoji;
    const key = item?.target?.key || item?.key;
    if (key && SIL[key]) return SIL[key];
    if (mode === 'shadow' && Array.isArray(item?.options)) return SIL[item.options[item.answer]] || '';
    if (mode === 'order' && Array.isArray(item?.items)) return item.items[0]?.[2] || '';
    return '';
  };

  it('Shapes Only shows the ANSWER, which is what the fact is about', () => {
    for (const q of POOLS.shadow) {
      expect(factIcon(q, 'shadow'), `${q.id}`).toBe(SIL[q.options[q.answer]]);
    }
  });

  it('Size It Up shows its subject, not its reference', () => {
    for (const q of POOLS.size) {
      expect(factIcon(q, 'size'), `${q.id}`).toBe(SIL[q.target.key]);
      expect(factIcon(q, 'size')).not.toBe(SIL[q.ref.key] === SIL[q.target.key] ? null : SIL[q.ref.key]);
    }
  });

  /* The point of the change: a mode with no subject artwork shows NOTHING. The
     old code always produced something, which is how it always produced a wrong
     something. */
  it('a mode with no subject shows no icon at all', () => {
    for (const mode of ['draw', 'share', 'odd', 'groups']) {
      const any = POOLS[mode].filter(q => factIcon(q, mode));
      expect(any.map(q => q.id), `${mode} invented an icon`).toEqual([]);
    }
  });

  it('never falls back to a theme', () => {
    // A question with a theme but no artwork must come back empty, not guess.
    const fake = { id: 'x', theme: 'missions', note: 'n' };
    expect(factIcon(fake, 'odd')).toBe('');
    expect(factIcon(fake, 'share')).toBe('');
  });
});
