import { shuffled, hash } from '../lib/random.js';

/** ODD ONE OUT — pick it, then pick WHY. The second half is worth as much as the
 *  first, which is the distinction a teacher actually cares about: right answer for
 *  the wrong reason is only half an understanding.
 *
 *  Both lists are SHUFFLED on display. They were authored in a fixed order and it
 *  showed: 37 of 39 questions had the true reason written first, so tapping the
 *  first reason every time scored 95% of that half without reading it. The odd
 *  item sat in position 3 or 4 in 31 of 39. Shuffling kills the tell for the
 *  questions that exist and for every one written later, which is why this is a
 *  fix in the mode rather than 39 content edits.
 *
 *  The permutation is seeded from the question id, so a question looks the same
 *  every time anyone sees it - the reveal and a shared screenshot have to agree. */
const orderOf = (id, n, salt) => shuffled([...Array(n).keys()], hash(String(id) + salt));

export const odd = {
  init: () => ({ pick: null, reason: null }),
  clear: () => ({ pick: null, reason: null }),
  // 50 for the item, 50 for the reason — spelled out, because "50/100" with a green
  // tick next to your answer looks like a bug rather than half marks.
  detail: (item, v) => {
    const a = v.pick === item.odd, b = v.reason === item.reason;
    return `${a ? '50 for the right item' : '0 — wrong item'}, `
         + `${b ? '50 for the right reason' : '0 — wrong reason'}.`;
  },
  ready: v => v.pick !== null && v.reason !== null,
  score: (item, v) => (v.pick === item.odd ? 50 : 0) + (v.reason === item.reason ? 50 : 0),
  extremity: () => 1,
  /** Display order only. `pick` and `reason` always hold the TRUE index, so
   *  scoring, the share card and every stored answer are untouched by this. */
  displayOrder: item => ({
    items: orderOf(item.id, item.items.length, ':oi'),
    reasons: orderOf(item.id, item.reasons.length, ':or'),
  }),
  Component: ({ item, value, setValue, revealed }) => {
    const ord = odd.displayOrder(item);
    return (
      <div className="m-odd">
        <div className="oddgrid">
          {ord.items.map(i => (
            <button key={item.items[i]} disabled={revealed} aria-pressed={value.pick === i}
              className={'opt'
                + (value.pick === i ? ' sel' : '')
                + (revealed ? (i === item.odd ? ' ok' : (value.pick === i ? ' bad' : '')) : '')}
              /* Changing your mind about WHICH item is odd invalidates the reason —
                 a reason chosen for the elephant is not a reason for the whale.
                 Leaving it selected let you submit a pairing you never meant. */
              onClick={() => setValue(prev => (
                prev.pick === i ? prev : { pick: i, reason: null }
              ))}>{item.items[i]}</button>
          ))}
        </div>
        {value.pick !== null && (
          <>
            <p className="stage2">And why? This half is worth as much as the first.</p>
            <div className="reasons">
              {ord.reasons.map(i => (
                <button key={i} disabled={revealed} aria-pressed={value.reason === i}
                  className={'opt wide'
                    + (value.reason === i ? ' sel' : '')
                    + (revealed ? (i === item.reason ? ' ok' : (value.reason === i ? ' bad' : '')) : '')}
                  onClick={() => setValue(prev => ({ ...prev, reason: i }))}>{item.reasons[i]}</button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  },
};
