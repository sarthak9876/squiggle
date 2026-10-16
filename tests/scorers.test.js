/* Scorer tests.

   These exist because a 16-question smoke run passed while the SIZE scorer was
   granting a flat 100 to anything within a factor of 1.20 — a player guessed 1.8x
   against a truth of 2.1x and was told "Uncanny, 100/100". A smoke test that plays
   badly cannot catch a scorer that is too generous. These play PERFECTLY. */
import { describe, it, expect } from 'vitest';
import { MODES, POOLS } from '../src/modes/index.js';
import { logScore } from '../src/modes/contract.js';
// normY and truthAt are module exports of draw.jsx, not members of the mode object.
import { normY, truthAt } from '../src/modes/draw.jsx';

/** The exact answer for a given mode and question. */
function perfectAnswer(key, item, m) {
  switch (key) {
    case 'share':  return { v: item.answer, touched: true };
    case 'size':   return { v: m.toSlider(item.answer), touched: true };
    case 'shadow': return item.answer;
    case 'odd':    return { pick: item.odd, reason: item.reason };
    case 'order':  return { seq: item.items.map((_, i) => i).sort((a, b) => item.items[b][1] - item.items[a][1]), sel: null };
    case 'groups': return { layout: [], picked: [], locked: item.groups.map(g => g.items) };
    case 'place':  return { fx: (item.answer[0] - item.x.min) / (item.x.max - item.x.min),
                            fy: 1 - (item.answer[1] - item.y.min) / (item.y.max - item.y.min) };
    case 'draw': {
      return Array.from({ length: m.SAMPLES }, (_, i) =>
        normY(item, truthAt(item, item.xMin + (item.xMax - item.xMin) * (i / (m.SAMPLES - 1)))));
    }
    default: throw new Error('no perfect answer defined for ' + key);
  }
}

describe('every scorer', () => {
  for (const [key, pool] of Object.entries(POOLS)) {
    const m = MODES[key];

    it(`${key}: perfect play scores exactly 100 on all ${pool.length} questions`, () => {
      for (const item of pool) {
        const s = m.score(item, perfectAnswer(key, item, m));
        expect(s, `${key}/${item.id || item.title}`).toBe(100);
      }
    });

    it(`${key}: the default value never returns NaN or an out-of-range score`, () => {
      for (const item of pool) {
        const s = m.score(item, m.init(item));
        expect(Number.isFinite(s), `${key}/${item.id}`).toBe(true);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);
      }
    });

    it(`${key}: ready() never throws on its own initial value`, () => {
      for (const item of pool) expect(() => m.ready(m.init(item), item)).not.toThrow();
    });
  }
});

describe('logScore is calibrated to the stated curve', () => {
  // Targets: 100 inside ±5%, ~50 at 1.5x out, ~20 at 2x out, 0 at 4x out.
  const T = 2.1;
  it('exact and within 5% are 100', () => {
    expect(logScore(T, T)).toBe(100);
    expect(logScore(T * 1.05, T)).toBe(100);
  });
  it('14% out is clearly not perfect — the reported bug', () => {
    const s = logScore(1.8, T);
    expect(s).toBeLessThan(95);
    expect(s).toBeGreaterThan(70);    // still a good guess, just not "perfect"
  });
  it('1.5x out is near 50', () => expect(Math.abs(logScore(T * 1.5, T) - 50)).toBeLessThan(10));
  it('2x out is near 20',   () => expect(Math.abs(logScore(T * 2, T) - 20)).toBeLessThan(10));
  it('4x out is zero',      () => expect(logScore(T * 4, T)).toBe(0));
  it('over and under are scored the same — direction is not merit', () => {
    expect(logScore(T * 1.5, T)).toBe(logScore(T / 1.5, T));
  });
  it('falls off monotonically', () => {
    const s = [1, 1.1, 1.3, 1.6, 2, 3, 5].map(m => logScore(T * m, T));
    for (let i = 1; i < s.length; i++) expect(s[i]).toBeLessThanOrEqual(s[i - 1]);
  });
});

describe('PUT IN ORDER scoring', () => {
  // The reported case: two swaps used to score 80 while the UI marked four cards
  // wrong. Proper Kendall tau makes the number match what the player actually did.
  const mk = vals => ({ seq: vals.map((_, i) => i), sel: null });
  const q = { id: 'test', items: [['a', 400], ['b', 150], ['c', 73], ['d', 65], ['e', 12]], unit: 'years' };
  const scoreOf = order => MODES.order.score(
    { ...q, items: order.map(v => q.items.find(i => i[1] === v)) }, mk(order));

  it('the correct order scores 100', () => expect(scoreOf([400, 150, 73, 65, 12])).toBe(100));
  it('exactly reversed scores 0',    () => expect(scoreOf([12, 65, 73, 150, 400])).toBe(0));
  it('one swap is high but not perfect', () => {
    const s = scoreOf([400, 150, 65, 73, 12]);
    expect(s).toBeGreaterThan(70); expect(s).toBeLessThan(90);
  });
  it('two swaps scores far below one swap', () => {
    expect(scoreOf([150, 400, 65, 73, 12])).toBeLessThan(scoreOf([400, 150, 65, 73, 12]));
    expect(scoreOf([150, 400, 65, 73, 12])).toBeLessThanOrEqual(65);
  });
  it('a badly shuffled order is near zero, not near 50', () => {
    expect(scoreOf([65, 12, 400, 73, 150])).toBeLessThan(25);
  });
  it('every real question: correct order scores 100, reversed scores 0', () => {
    for (const item of POOLS.order) {
      const best = item.items.map((_, i) => i).sort((a, b) => item.items[b][1] - item.items[a][1]);
      expect(MODES.order.score(item, { seq: best, sel: null }), item.id).toBe(100);
      expect(MODES.order.score(item, { seq: best.slice().reverse(), sel: null }), item.id).toBe(0);
    }
  });
});

describe('every mode offers a way to undo', () => {
  it('has clear()', () => {
    for (const key of Object.keys(MODES)) expect(typeof MODES[key].clear, key).toBe('function');
  });
});

describe('content integrity', () => {
  // A tie in an ORDER question has no single correct sequence, so perfect play can
  // never reach 100. This shipped once (WhatsApp and Instagram both at 2,000M) and
  // the perfect-play test caught it — this makes the cause explicit.
  it('ORDER questions contain no tied values', () => {
    for (const item of POOLS.order) {
      const vals = item.items.map(i => i[1]);
      expect(new Set(vals).size, `${item.id} has a tie`).toBe(vals.length);
    }
  });
  // Two values a hair apart are a coin flip the player cannot reason about.
  it('ORDER values are distinguishable, not coin flips', () => {
    for (const item of POOLS.order) {
      const v = item.items.map(i => i[1]).sort((a, b) => a - b);
      const span = v[v.length - 1] - v[0];
      for (let i = 1; i < v.length; i++) {
        const ratio = v[i - 1] > 0 ? v[i] / v[i - 1] : Infinity;
        const share = span > 0 ? (v[i] - v[i - 1]) / span : 0;
        expect(ratio < 1.10 && share < 0.02, `${item.id}: ${v[i-1]} vs ${v[i]}`).toBe(false);
      }
    }
  });
  // A slider answer at 0-2% or 98-100% is free points.
  it('SHARE answers are not at the slider extremes', () => {
    for (const q of POOLS.share) {
      expect(q.answer, q.id).toBeGreaterThan(2);
      expect(q.answer, q.id).toBeLessThan(97);
    }
  });
  // Every SHADOW option must have a drawable emoji or the tile renders blank.
  it('SHADOW options all have a picture', async () => {
    const { SIL } = await import('../src/content/emoji.js');
    for (const q of POOLS.shadow)
      for (const o of q.options) expect(SIL[o], `${q.id}: ${o}`).toBeTruthy();
  });
  // GROUPS: an item in two sets has no single right answer.
  it('GROUPS items appear in exactly one set', () => {
    for (const g of POOLS.groups) {
      const all = g.groups.flatMap(x => x.items);
      expect(all.length, g.id).toBe(9);
      expect(new Set(all).size, g.id).toBe(9);
    }
  });
  // ODD: exactly one reason may be true, recorded by hand as trueCount.
  it('ODD questions have exactly one true reason', () => {
    for (const q of POOLS.odd) expect(q.trueCount, q.id).toBe(1);
  });
  // PLACE: these were all caught by hand after the fact. Making them permanent so
  // new questions fail the suite rather than reaching a player.
  it('PLACE answers are not pinned to an axis edge', () => {
    for (const p of POOLS.place) {
      const nx = (p.answer[0] - p.x.min) / (p.x.max - p.x.min);
      const ny = (p.answer[1] - p.y.min) / (p.y.max - p.y.min);
      expect(nx, `${p.id} x`).toBeGreaterThan(0.03);
      expect(nx, `${p.id} x`).toBeLessThan(0.97);
      expect(ny, `${p.id} y`).toBeGreaterThan(0.03);
      expect(ny, `${p.id} y`).toBeLessThan(0.97);
    }
  });
  it('PLACE references are on the chart and never give the answer away', () => {
    for (const p of POOLS.place) {
      const nx = v => (v - p.x.min) / (p.x.max - p.x.min);
      const ny = v => (v - p.y.min) / (p.y.max - p.y.min);
      expect(p.refs.length, p.id).toBeGreaterThanOrEqual(3);
      for (const r of p.refs) {
        expect(nx(r[1]), `${p.id} ref ${r[0]} x`).toBeGreaterThan(-0.02);
        expect(nx(r[1]), `${p.id} ref ${r[0]} x`).toBeLessThan(1.02);
        expect(ny(r[2]), `${p.id} ref ${r[0]} y`).toBeGreaterThan(-0.02);
        expect(ny(r[2]), `${p.id} ref ${r[0]} y`).toBeLessThan(1.02);
        const d = Math.hypot(nx(r[1]) - nx(p.answer[0]), ny(r[2]) - ny(p.answer[1]));
        expect(d, `${p.id}: "${r[0]}" sits on the answer`).toBeGreaterThanOrEqual(0.15);
      }
    }
  });
  it('PLACE items all carry an emoji', () => {
    for (const p of POOLS.place) expect(p.emoji, p.id).toBeTruthy();
  });
  // Every question that cites a number should say where it came from.
  it('every question that STATES A NUMBER carries a real source', () => {
    /* A teacher must be able to chase any number back to whoever published it.
       Was "every question", which pushed sixteen pure categorisation puzzles
       ("sort these into keyboard keys / chess pieces") into citing "General
       knowledge" — a citation that cites nothing and made the About page's
       promise false. A word puzzle states no number, so it owes no source;
       anything with a number owes a real one. */
    const BANNED = /^(general knowledge|geography|history|common knowledge|various|wordplay|comparative [a-z ]+)$/i;
    const NUMERIC = ['size', 'share', 'place', 'draw', 'order', 'shadow'];
    const bad = [];
    for (const key of NUMERIC)
      for (const q of POOLS[key]) {
        if (!q.source) bad.push(`${key}/${q.id}: no source`);
        else if (BANNED.test(q.source.trim())) bad.push(`${key}/${q.id}: "${q.source}" is not a source`);
      }
    // And a non-numeric question may have no source, but never a fake one.
    for (const key of ['odd', 'groups'])
      for (const q of POOLS[key])
        if (q.source && BANNED.test(q.source.trim())) bad.push(`${key}/${q.id}: "${q.source}" is not a source`);
    expect(bad, bad.join('\n')).toEqual([]);
  });

  // SIZE ratios must be reachable on the 0.05x-200x slider.
  it('SIZE ratios are reachable on the slider', () => {
    for (const q of POOLS.size) {
      expect(q.answer, q.id).toBeGreaterThan(0.05);
      expect(q.answer, q.id).toBeLessThan(200);
    }
  });
  it('every question carries a note worth reading', () => {
    for (const [key, pool] of Object.entries(POOLS))
      for (const item of pool)
        expect(item.note?.length ?? 0, `${key}/${item.id}`).toBeGreaterThan(25);
  });
  it('no duplicate ids within a pool', () => {
    for (const [key, pool] of Object.entries(POOLS)) {
      const ids = pool.map(i => i.id).filter(Boolean);
      expect(new Set(ids).size, key).toBe(ids.length);
    }
  });
});

describe('no dead navigation state', () => {
  // `view` is derived from the URL. A stray setView() would navigate without
  // changing the address bar, which is exactly how Back ends up out of sync —
  // and one survived a refactor and shipped, so this is now checked.
  it('App.jsx never calls setView', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
    expect(src).not.toMatch(/setView\s*\(/);
  });
  it('no placeholder copy ships', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const dirs = ['components', 'lib', 'modes'];
    for (const d of dirs) {
      const base = new URL(`../src/${d}/`, import.meta.url);
      for (const f of readdirSync(base)) {
        const txt = readFileSync(new URL(f, base), 'utf8');
        expect(txt, `${d}/${f}`).not.toMatch(/Your Name|Lorem ipsum|Game screens land next/);
      }
    }
  });
});

describe('every score explains itself', () => {
  // "47/100" with no explanation reads as arbitrary. Every mode must be able to say
  // how it got there, and clear() must take the ITEM — one mode took the value,
  // was handed the item, and crashed the whole screen.
  it('all modes expose detail()', () => {
    for (const key of Object.keys(MODES))
      expect(typeof MODES[key].detail, key).toBe('function');
  });

  it('detail() returns real text for a real answer, on every question', () => {
    for (const [key, pool] of Object.entries(POOLS)) {
      const m = MODES[key];
      for (const item of pool) {
        const txt = m.detail(item, perfectAnswer(key, item, m));
        expect(typeof txt, `${key}/${item.id}`).toBe('string');
        expect(txt.length, `${key}/${item.id}`).toBeGreaterThan(5);
      }
    }
  });

  it('clear(item) returns the same shape as init(item) and never throws', () => {
    for (const [key, pool] of Object.entries(POOLS)) {
      const m = MODES[key];
      for (const item of pool) {
        const cleared = m.clear(item);
        expect(() => m.ready(cleared, item), `${key}/${item.id} ready`).not.toThrow();
        expect(() => m.score(item, cleared), `${key}/${item.id} score`).not.toThrow();
        const a = m.init(item), b = cleared;
        const shape = x => x === null ? 'null' : Array.isArray(x) ? 'array' : typeof x;
        expect(shape(b), `${key}/${item.id} shape`).toBe(shape(a));
        if (shape(a) === 'object') {
          expect(Object.keys(b).sort(), `${key}/${item.id} keys`).toEqual(Object.keys(a).sort());
        }
      }
    }
  });

  it('SIZE questions never draw a giraffe as a horse', () => {
    // Every size target must reference an emoji whose key matches what the label
    // actually says, for the obvious animals.
    const mustMatch = { giraffe: 'Giraffe', whale: 'whale', shark: 'shark', horse: 'Horse', cat: 'cat' };
    for (const q of POOLS.size) {
      const key = q.target.key, label = q.target.label.toLowerCase();
      if (mustMatch[key]) continue;
      for (const [k, needle] of Object.entries(mustMatch))
        if (label.includes(needle.toLowerCase()))
          expect(key, `${q.id}: "${q.target.label}" is drawn with the "${key}" emoji`).toBe(k);
    }
  });
});

/* Answer POSITION must not be an answer. Both of these pools were authored in a
   fixed order and leaked badly: 37 of 39 Odd One Out questions had the true
   reason written first, so tapping slot 1 every time scored 95% of that half.
   The modes now shuffle on display; this asserts the shuffle actually spreads,
   and will fail again if anyone removes it. */
describe('no positional tell', () => {
  const slotOf = (ordFn, item, truth) => ordFn(item).indexOf(truth);

  it('odd one out: the true reason is not always in the same slot', () => {
    const slots = POOLS.odd.map(q => MODES.odd.displayOrder(q).reasons.indexOf(q.reason));
    const top = Math.max(...count(slots));
    expect(top / slots.length, `best slot wins ${top}/${slots.length}`).toBeLessThan(0.45);
  });

  it('odd one out: the odd item is not always in the same slot', () => {
    const slots = POOLS.odd.map(q => MODES.odd.displayOrder(q).items.indexOf(q.odd));
    const top = Math.max(...count(slots));
    expect(top / slots.length, `best slot wins ${top}/${slots.length}`).toBeLessThan(0.45);
  });

  it('shapes only: the answer is not always in the same slot', () => {
    const slots = POOLS.shadow.map(q => slotOf(MODES.shadow.displayOrder, q, q.answer));
    const top = Math.max(...count(slots));
    expect(top / slots.length, `best slot wins ${top}/${slots.length}`).toBeLessThan(0.45);
  });

  it('display order is stable for the same question', () => {
    const q = POOLS.odd[0];
    expect(MODES.odd.displayOrder(q)).toEqual(MODES.odd.displayOrder(q));
  });
});

function count(slots) {
  const m = {};
  for (const s of slots) m[s] = (m[s] || 0) + 1;
  return Object.values(m);
}
