import { describe, it, expect } from 'vitest';
import { groups } from '../src/modes/groups.jsx';
import { POOLS } from '../src/modes/index.js';

/* The exact case from pre-launch QA: the player made one mistake in each of two
   sets, and the app reported SIX wrong cards and outlined six. */
const item = {
  id: 'test-colours',
  groups: [
    { label: 'Colours', items: ['Indigo', 'Teal', 'Amber'] },
    { label: 'Flowers', items: ['Lily', 'Iris', 'Dahlia'] },
    { label: 'Citrus',  items: ['Lime', 'Yuzu', 'Pomelo'] },
  ],
};

describe('Make The Sets — misplaced cards', () => {
  it('counts only the cards that are actually in the wrong set', () => {
    const locked = [['Amber','Teal','Lime'], ['Iris','Lily','Dahlia'], ['Indigo','Pomelo','Yuzu']];
    const { misplaced } = groups.assignSets(item, locked);
    expect([...misplaced].sort()).toEqual(['Indigo', 'Lime']);   // was 6 cards
    expect(groups.detail(item, { locked })).toContain('2 cards in the wrong set');
    expect(groups.detail(item, { locked })).toContain('outlined above');
  });

  it('a perfect answer flags nothing, whatever order the sets were built in', () => {
    const locked = [['Lime','Yuzu','Pomelo'], ['Indigo','Teal','Amber'], ['Lily','Iris','Dahlia']];
    expect(groups.assignSets(item, locked).misplaced.size).toBe(0);
    expect(groups.score(item, { locked })).toBe(100);
    expect(groups.detail(item, { locked })).toContain('perfect');
  });

  it('one swap between two sets is two wrong cards, not four', () => {
    const locked = [['Indigo','Teal','Lily'], ['Amber','Iris','Dahlia'], ['Lime','Yuzu','Pomelo']];
    expect(groups.assignSets(item, locked).misplaced.size).toBe(2);
  });

  it('a total scramble does not exceed nine', () => {
    const locked = [['Indigo','Lily','Lime'], ['Teal','Iris','Yuzu'], ['Amber','Dahlia','Pomelo']];
    const n = groups.assignSets(item, locked).misplaced.size;
    expect(n).toBeGreaterThan(4);
    expect(n).toBeLessThanOrEqual(9);
  });

  it('every real question agrees: a perfect answer has zero misplaced', () => {
    for (const q of POOLS.groups) {
      const locked = q.groups.map(g => [...g.items]);
      expect(groups.assignSets(q, locked).misplaced.size, q.id).toBe(0);
      expect(groups.score(q, { locked }), q.id).toBe(100);
    }
  });

  it('colours stay with the set the player built', () => {
    const locked = [['Amber','Teal','Lime'], ['Iris','Lily','Dahlia'], ['Indigo','Pomelo','Yuzu']];
    const { setOf } = groups.assignSets(item, locked);
    expect(setOf.get('Lime')).toBe(0);      // not recoloured to Citrus on reveal
    expect(setOf.get('Indigo')).toBe(2);
  });
});
