import { shuffled, hash } from '../lib/random.js';

/* Which answer group did the player MEAN by each of their sets?
   The old code compared set #n to answer group #n, which is meaningless — the
   player never chose an order. Worse, it marked a card wrong merely for sharing a
   set with a wrong card, so one intruder painted all three red:
   {Amber,Teal,Lime} reported 3 misplaced when only Lime was.

   Match each user set to the answer group it overlaps most (all 6 permutations of
   3 — brute force is 6 comparisons, an assignment algorithm would be more code
   than it saves). A card is misplaced only if it is absent from its set's match. */
const PERMS = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];

export function assignSets(item, locked) {
  const truth = item.groups.map(g => g.items);
  const overlap = locked.map(set => truth.map(t => set.filter(l => t.includes(l)).length));
  let best = PERMS[0], bestScore = -1;
  for (const perm of PERMS) {
    const score = perm.reduce((sum, g, i) => sum + ((overlap[i] || [])[g] || 0), 0);
    if (score > bestScore) { bestScore = score; best = perm; }
  }
  const misplaced = new Set();
  locked.forEach((set, i) => {
    const mine = truth[best[i]] || [];
    for (const label of set) if (!mine.includes(label)) misplaced.add(label);
  });
  // setOf: label -> the index of the USER set holding it, so colours stay put on
  // reveal instead of jumping to the true group's colour.
  const setOf = new Map();
  locked.forEach((set, i) => set.forEach(l => setOf.set(l, i)));
  return { match: best, misplaced, setOf };
}

/** MAKE THE SETS — nine things, three hidden sets.
 *  The only mode where you can KNOW you are right. Every other game here is an
 *  estimation game where you are merely more or less wrong, and that click of
 *  certainty is a different and more addictive feeling. */
export const groups = {
  init: item => ({
    layout: shuffled(item.groups.flatMap(g => g.items), hash(item.id + ':layout')),
    picked: [], locked: [],
  }),
  // clear(item) — same signature as init(). This previously took the VALUE and
  // was handed the ITEM, producing an object with no `layout` and crashing the
  // render. Rebuilding from the item is also the behaviour a player expects:
  // "clear" should reset, not half-reset.
  clear: item => ({
    layout: shuffled(item.groups.flatMap(x => x.items), hash(item.id + ':layout')),
    picked: [], locked: [],
  }),
  ready: v => v.locked.length === 3,
  score: (item, v) => {
    // Pair-based, not set-based. Whole sets give only 0 / 33 / 100 and punish someone
    // who was one swap away as if they had guessed at random.
    const groupOf = label => item.groups.findIndex(g => g.items.includes(label));
    let right = 0, total = 0;
    for (const set of v.locked)
      for (let i = 0; i < set.length; i++)
        for (let j = i + 1; j < set.length; j++) { total++; if (groupOf(set[i]) === groupOf(set[j])) right++; }
    return total ? Math.round(100 * right / total) : 0;
  },
  detail: (item, v) => {
    const groupOf = l => item.groups.findIndex(x => x.items.includes(l));
    let right = 0, total = 0;
    for (const set of v.locked)
      for (let i = 0; i < set.length; i++)
        for (let j = i + 1; j < set.length; j++) { total++; if (groupOf(set[i]) === groupOf(set[j])) right++; }
    const misplaced = assignSets(item, v.locked).misplaced.size;
    return `${right} of ${total} pairs correctly grouped`
         + (misplaced ? ` · ${misplaced} card${misplaced === 1 ? '' : 's'} in the wrong set (outlined above)` : ' · perfect');
  },
  assignSets,
  Component: ({ item, value, setValue, revealed }) => {
    const groupOf = label => item.groups.findIndex(g => g.items.includes(label));
    const verdict = revealed ? assignSets(item, value.locked) : null;
    return (
      <div className="m-groups">
        <div className="ggrid">
          {value.layout.map(label => {
            const li = value.locked.findIndex(s => s.includes(label));
            /* Colour by the set the PLAYER built, not by the true group. Recolouring
               on reveal made every tile jump at once and you lost track of what you
               had actually done. Correctness is shown by an outline and a mark, which
               does not depend on colour vision either. */
            const misplaced = !!verdict && verdict.misplaced.has(label);
            const cls = revealed
              ? `gitem t${verdict.setOf.get(label) ?? groupOf(label)}${misplaced ? ' misplaced' : ' placedok'}`
              : 'gitem'
                + (value.picked.includes(label) ? ' sel' : '')
                + (li >= 0 ? ` locked g${li}` : '');
            return (
              <button key={label} className={cls} disabled={revealed}
                aria-pressed={value.picked.includes(label) || value.locked.some(g => g.includes(label))}
                onClick={() => setValue(prev => {
                  const idx = prev.locked.findIndex(s => s.includes(label));
                  if (idx >= 0) {
                    /* Once all three groups are locked the puzzle is COMPLETE, and
                       the instruction still says "tap three that belong together" —
                       so players tap the last three. Each tap used to toggle the
                       auto-locked group off, then on, then off, leaving nothing
                       locked and Submit dead with no explanation.
                       A finished board ignores taps; Reset is the way out. */
                    if (prev.locked.length === 3) return prev;
                    const locked = prev.locked.slice(); locked.splice(idx, 1);
                    return { ...prev, locked };
                  }
                  const at = prev.picked.indexOf(label);
                  let picked = at >= 0 ? prev.picked.filter(x => x !== label) : [...prev.picked, label];
                  let locked = prev.locked;
                  if (picked.length === 3) { locked = [...locked, picked]; picked = []; }
                  // Two sets locked leaves exactly one possible third. Asking the
                  // player to tap it out is busywork, not a decision.
                  if (locked.length === 2) {
                    const used = new Set(locked.flat());
                    const rest = prev.layout.filter(l => !used.has(l));
                    if (rest.length === 3) { locked = [...locked, rest]; picked = []; }
                  }
                  return { ...prev, picked, locked };
                })}>
                {label}
                {revealed && <span className="gmark" aria-hidden="true">{misplaced ? '✕' : '✓'}</span>}
                {revealed && <span className="sr-only">{misplaced ? ' — wrong set' : ' — correct'}</span>}
              </button>
            );
          })}
        </div>
        {revealed && (
          <div className="gkey">
            {item.groups.map((g, i) => {
              /* The swatch must use the PLAYER's set index, not the truth index.
                 Tiles are coloured by the set the player built (see above), while
                 this legend used its own position in item.groups — so the moment
                 someone locked their sets in a different order from the answer
                 key, the legend said "IPL teams" in yellow beside green IPL
                 tiles. verdict.match maps player set -> truth group; the legend
                 needs the inverse of it. */
              const mine = verdict.match.findIndex(truthIdx => truthIdx === i);
              return (
                <div key={g.label} className="gkeyrow">
                  <span className={'gsw t' + (mine >= 0 ? mine : i)} /><b>{g.label}</b> — {g.items.join(', ')}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  },
};
