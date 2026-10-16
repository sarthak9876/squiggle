import { describe, it, expect } from 'vitest';
import { place, axisFormat, fmtAxis } from '../src/modes/place.jsx';
import { POOLS } from '../src/modes/index.js';

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
    expect(fmtAxis(216, 'Population (millions)')).toBe('216 millions');
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
