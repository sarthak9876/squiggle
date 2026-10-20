import { describe, it, expect } from 'vitest';
import { POOLS, ALL_POOLS } from '../src/modes/index.js';
import { lineupFor, LAUNCH_DAY, uniqueDays } from '../src/lib/schedule.js';

/* The retest that prompted this file: "the bundle still mentions India 171
   times, has 86 questions tagged region:'india', and uses ₹ 16 times. Only ~5
   mentions are USA and 2 are Nigeria. Practice mode ignores the region cap."

   Capping regions per DAY could never fix that. One a day still means every set
   a player in Lagos or Lima ever plays contains a question about Indian states
   or cricket, and practice drew from the same unfiltered pool. The region packs
   are filtered out of POOLS entirely now, which fixes daily, practice and
   archive at once because all three read POOLS. */

const inPlay = Object.values(POOLS).flat();
const text = JSON.stringify(inPlay);

describe('the bank a player sees is global', () => {
  it('no region-tagged question is in play', () => {
    const left = inPlay.filter(q => q.region).map(q => q.id);
    expect(left, `region questions in play: ${left.join(', ')}`).toEqual([]);
  });

  /* A price only a local can read is the sharpest version of this. "₹499 per GB"
     is not a hard question outside India, it is an unanswerable one. */
  it('no currency symbol only one country uses', () => {
    for (const sym of ['₹', '元', '₦', '₽', '₩']) {
      expect(text.includes(sym), `${sym} is in a question a global player gets`).toBe(false);
    }
  });

  /* The real target is not "never say India" — it is that no ONE country
     dominates. India is still named 13 times, all of them as one of five
     countries, one of four oceans or one of three currencies. */
  it('no single country dominates what is in play', () => {
    const counts = {};
    for (const c of ['India', 'United States', 'USA', 'China', 'Brazil', 'Nigeria', 'Japan', 'Germany']) {
      counts[c] = (text.match(new RegExp(c, 'gi')) || []).length;
    }
    const top = Math.max(...Object.values(counts));
    expect(top, `most-mentioned country appears ${top}x: ${JSON.stringify(counts)}`).toBeLessThan(40);
  });

  it('the region packs are filtered, not deleted — a locale can switch them on', () => {
    const packed = Object.values(ALL_POOLS).flat().filter(q => q.region).length;
    expect(packed).toBeGreaterThan(50);
  });
});

describe('a question does not come back the next day', () => {
  /* The retest found "How long is a BUS compared to a car?" in two consecutive
     daily sets. Measured over 365 days the real figure was worse: a minimum gap
     of ONE day and 5164 repeats inside 30 days.

     30 days is arithmetically impossible at this bank size and no amount of
     scheduling fixes it: the thinnest mode holds 33 questions and spends 2 a
     day, so the bank runs dry after 16 days. A 30-day guarantee needs 60 per
     mode. What IS achievable is that nothing comes back within a few days, and
     that is what these pin. */
  const gaps = (days = 730) => {
    const last = new Map(), out = [];
    for (let d = 0; d < days; d++)
      for (const s of lineupFor(POOLS, 'p', LAUNCH_DAY + d)) {
        const k = s.mode + '/' + s.item.id;
        if (last.has(k)) out.push([d - last.get(k), k, d]);
        last.set(k, d);
      }
    return out;
  };

  it('never repeats a question on consecutive days', () => {
    const next = gaps().filter(g => g[0] === 1);
    expect(next, `consecutive repeats: ${next.slice(0, 4).map(g => g[1]).join(', ')}`).toEqual([]);
  });

  it('keeps same-week repeats rare', () => {
    const g = gaps();
    const tight = g.filter(x => x[0] < 5).length;
    // 4 over two years. A floor, not a target — if this regresses the seam broke.
    expect(tight, 'repeats inside 5 days').toBeLessThanOrEqual(6);
    expect(g.filter(x => x[0] < 8).length, 'repeats inside 8 days').toBeLessThanOrEqual(20);
  });

  /* States the ceiling so the next person does not try to tune SEAM to reach 30
     days. It cannot be reached by scheduling, only by writing questions. */
  it('records how much bank a 30-day guarantee would need', () => {
    const need = Object.entries(POOLS).map(([mode, p]) => [mode, p.length, 30 * 2]);
    const short = need.filter(([, have, want]) => have < want);
    expect(short.length, 'every mode is already big enough for 30 days').toBeGreaterThan(0);
  });
});
