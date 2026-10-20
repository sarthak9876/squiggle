import { describe, it, expect } from 'vitest';
import { assignSets } from '../src/modes/groups.jsx';
import { POOLS } from '../src/modes/index.js';

/* The tiles are coloured by the set the PLAYER built; the legend used its own
   position in item.groups. Those agree only when someone happens to lock their
   sets in the same order the answer key lists them. Any other order and the
   legend showed "IPL teams" in yellow beside green IPL tiles. */

const colourOfTile = (verdict, label, truthIdx) => verdict.setOf.get(label) ?? truthIdx;
const colourOfLegend = (verdict, truthIdx) => {
  const mine = verdict.match.findIndex(t => t === truthIdx);
  return mine >= 0 ? mine : truthIdx;
};

describe('legend colours match tile colours', () => {
  it('agrees for every question, in every lock order', () => {
    const wrong = [];
    for (const q of POOLS.groups) {
      const truth = q.groups.map(g => g.items);
      // Every order a player could lock their three sets in.
      for (const order of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) {
        const locked = order.map(i => truth[i]);
        const verdict = assignSets(q, locked);
        q.groups.forEach((g, truthIdx) => {
          const legend = colourOfLegend(verdict, truthIdx);
          for (const label of g.items) {
            const tile = colourOfTile(verdict, label, truthIdx);
            if (tile !== legend)
              wrong.push(`${q.id} order ${order.join('')}: "${label}" tile t${tile} vs legend t${legend}`);
          }
        });
      }
    }
    expect(wrong.slice(0, 6), `${wrong.length} mismatches`).toEqual([]);
  });

  it('a perfectly played board still agrees when sets are locked backwards', () => {
    const q = POOLS.groups[0];
    const locked = [...q.groups].reverse().map(g => g.items);
    const verdict = assignSets(q, locked);
    q.groups.forEach((g, truthIdx) => {
      const legend = colourOfLegend(verdict, truthIdx);
      for (const label of g.items) expect(verdict.setOf.get(label)).toBe(legend);
    });
  });
});
