import { describe, it, expect } from 'vitest';
import { place, axisFormat, fmtAxis } from '../src/modes/place.jsx';
import { POOLS } from '../src/modes/index.js';
import { niceTicks } from '../src/lib/ticks.js';

/* QA: 'Years show with thousands separators: "You placed it at 6,188 / 1,913".
   No units in the reveal ("1,500 / 44" — of what?).' */
describe('Place The Dot — axis formatting', () => {
  it('never puts a thousands separator in a year', () => {
    expect(fmtAxis(1913, 'Year first climbed')).toBe('1913');
    expect(fmtAxis(2001, 'Year founded')).toBe('2001');
    expect(fmtAxis(1653, 'Year completed')).toBe('1653');
  });

  it('carries the unit from the axis label', () => {
    expect(fmtAxis(6190, 'Height above sea level (m)')).toBe('6,190 m');
    expect(fmtAxis(44, 'Share of world species (%)')).toBe('44%');
    // Scale words stay singular after a number: "216 million", not "216 millions".
    expect(fmtAxis(216, 'Population (millions)')).toBe('216 million');
    expect(fmtAxis(3.1, 'Monthly visitors (billions)')).toBe('3.1 billion');
    expect(fmtAxis(28.4, 'Median age (years)')).toBe('28.4 years');   // real plural, kept
  });

  it('renders a log axis as a power of ten, not as 44', () => {
    expect(axisFormat('Possible positions (log₁₀)').kind).toBe('log');
    expect(fmtAxis(44, 'Possible positions (log₁₀)')).toBe('10^44');
  });

  it('"Median age (years)" is a number with a unit, not a calendar year', () => {
    expect(axisFormat('Median age (years)').kind).toBe('num');
    expect(fmtAxis(28.4, 'Median age (years)')).toBe('28.4 years');
  });

  it('the reveal line names both axes and uses their units', () => {
    const q = POOLS.place.find(x => /Year/i.test(x.x.label)) || POOLS.place[0];
    const d = place.detail(q, { fx: 0.5, fy: 0.5 });
    expect(d).toContain('you ');
    expect(d).toContain('answer ');
    expect(d).toContain('·');
    expect(d).not.toMatch(/\d,\d{3}(?!\s*(m|km|kg|tonnes))/);   // no stray separated years
  });

  it('every axis in the bank formats without throwing', () => {
    for (const q of POOLS.place)
      for (const ax of [q.x, q.y]) {
        expect(() => fmtAxis(ax.min, ax.label), q.id).not.toThrow();
        expect(() => fmtAxis(ax.max, ax.label), q.id).not.toThrow();
        expect(typeof fmtAxis((ax.min + ax.max) / 2, ax.label)).toBe('string');
      }
  });
});


/* Both charts cut their range into four equal parts, which gave a 0-55 axis
   labelled 0 / 14 / 28 / 41 / 55 and — worse — a 0-30 axis whose fourth
   gridline sat at 22.5 and was printed as "23", so the number disagreed with
   the line it pointed at. */
describe('axis ticks', () => {
  /* "Round" is not a property of a single value — 150 and 1995 are both round,
     and a predicate over one number says otherwise (the first version of this
     test failed on 58 perfectly good ticks). The real invariant is the STEP:
     ticks must be evenly spaced by 1, 2, 2.5 or 5 times a power of ten. That is
     what makes 0/10/20/30 readable and 0/14/28/41 not. */
  const stepOf = ticks => {
    const d = ticks.slice(1).map((v, i) => +(v - ticks[i]).toFixed(10));
    return d.length && d.every(x => Math.abs(x - d[0]) < 1e-9) ? d[0] : null;
  };
  const onLadder = step => {
    const mag = Math.pow(10, Math.floor(Math.log10(step)));
    return [1, 2, 2.5, 5, 10].some(m => Math.abs(step - m * mag) < 1e-9);
  };
  const axes = [];
  for (const q of POOLS.place) axes.push([q.id + '.x', q.x], [q.id + '.y', q.y]);

  it('every axis steps by a round amount, evenly', () => {
    const bad = [];
    for (const [name, a] of axes) {
      const t = niceTicks(a.min, a.max);
      const step = stepOf(t);
      if (step == null) bad.push(`${name}: uneven ${t.join('/')}`);
      else if (!onLadder(step)) bad.push(`${name}: step ${step} (${t.join('/')})`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  /* Each label is drawn at its own value's position now, not at a fixed
     fraction, so a tick outside the range would be painted outside the plot. */
  it('no tick falls outside its axis range', () => {
    const bad = [];
    for (const [name, a] of axes) {
      for (const v of niceTicks(a.min, a.max)) {
        if (v < a.min - 1e-9 || v > a.max + 1e-9) bad.push(`${name}: ${v} outside ${a.min}..${a.max}`);
      }
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('every axis gets at least three ticks', () => {
    const thin = axes
      .map(([name, a]) => [name, niceTicks(a.min, a.max).length, a])
      .filter(([, n]) => n < 3)
      .map(([name, n, a]) => `${name}: ${n} (${a.min}..${a.max})`);
    expect(thin, thin.join(' | ')).toEqual([]);
  });
});
