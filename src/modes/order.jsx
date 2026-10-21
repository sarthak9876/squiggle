import { useRef } from 'react';
import { motion } from 'framer-motion';
import { emojiUrl } from '../lib/emojiUrl.js';
import { shuffled } from '../lib/random.js';
import { hash } from '../lib/random.js';

/* WHICH WAY THE PROMPT READS.

   Most prompts want the largest value first ("Heaviest animal first") and the
   engine was written for only that. But six questions ask for the SMALLEST
   first — "Closest to the Sun first" (Mercury, 58 Mkm), "Oldest company first"
   (Nintendo, 1889), "Fastest to one million users first" (ChatGPT, 5 days) —
   and for those the stored value is smallest-is-the-answer.

   Without this flag a player who answered them perfectly scored 0, and the
   reveal then animated the cards into the REVERSED order and presented it as
   the truth: Neptune as the planet closest to the Sun, television as older than
   the printing press. Marked with `asc: true` in the content file.

   Note o19 ("Oldest first") is deliberately NOT asc — its values are years AGO,
   so largest-first is already oldest-first. The flag describes the VALUES, not
   the wording. */
const dirOf = item => (item.asc ? -1 : 1);
/** Should value `a` sit before value `b` for this item? Ties are never "before",
 *  which keeps tie handling identical to the original strict comparison. */
const before = (item, a, b) => (a - b) * dirOf(item) > 0;

/** PUT IN ORDER — drag a card to move it, or tap two cards to swap them.
 *  Drag is what everybody reaches for first; tap-to-swap stays because it is the
 *  only thing that works with a keyboard and the only thing that works when a
 *  phone decides your drag was a page scroll. */
/* The opening shuffle has to be a real shuffle.
   A plain seeded shuffle lands close to sorted often enough to matter: QA found a
   set that opened with the true first item already first, and another where
   submitting WITHOUT TOUCHING ANYTHING scored 60/100. A start position that scores
   is not a puzzle, it is a free sixty points.

   So: re-roll the seeded shuffle until at least 60% of pairs are out of order and
   neither end sits on its true end. Still fully deterministic — the counter is
   part of the seed, so everyone sees the same opening for a given question. */
function openingSeq(item) {
  const n = item.items.length;
  const vals = item.items.map(x => x[1]);
  const idx = item.items.map((_, i) => i);
  // Correct order follows the item's direction, matching score()'s concordance test.
  const truth = [...idx].sort((a, b) => (vals[b] - vals[a]) * dirOf(item));
  const totalPairs = (n * (n - 1)) / 2;
  const discordant = seq => {
    let d = 0;
    for (let i = 0; i < seq.length; i++)
      for (let j = i + 1; j < seq.length; j++) if (!before(item, vals[seq[i]], vals[seq[j]])) d++;
    return d;
  };
  const needed = Math.ceil(totalPairs * 0.6);          // 6 of 10 for five cards

  /* Maximising discordant pairs sounds right and is wrong: the arrangement with
     the MOST discordant pairs is the exact reverse, so this handed out boards
     whose whole solution was "reverse it". A playtest hit one — Hottest first
     opening as water, candle, lava, lightning, sun.

     Reject both degenerate orders outright and aim for a MIDDLING scramble
     rather than the worst one. */
  const sortedSeq = truth.map((_, i) => i);
  const same = (a, b) => a.every((v, i) => v === b[i]);
  const reversed = [...sortedSeq].reverse();
  const degenerate = seq => same(seq.map(i => idx.indexOf(i)), sortedSeq)
                         || same(seq.map(i => idx.indexOf(i)), reversed);

  let best = null, bestScore = Infinity;
  for (let c = 0; c < 60; c++) {
    const seq = shuffled(idx, hash(`${item.id}:start:${c}`));
    if (degenerate(seq)) continue;
    const d = discordant(seq);
    // Closest to "needed" wins, rather than the most scrambled of all.
    const score = Math.abs(d - needed);
    if (score < bestScore) { bestScore = score; best = seq; }
    const endsMoved = seq[0] !== truth[0] && seq[n - 1] !== truth[n - 1];
    if (d >= needed && endsMoved) return seq;
  }
  return best || shuffled(idx, hash(`${item.id}:start:fallback`));
}

export const order = {
  init: item => ({ seq: openingSeq(item), sel: null, touched: false }),
  /* Reset means "back to the start", and the start is openingSeq — the shuffle
     above exists entirely to make sure a start position does not score. This
     returned item.items.map((_, i) => i), the AUTHORED order, and 38 of the 45
     questions are authored already sorted: Reset was a free 100 on 84% of the
     bank, through the one button guaranteed to be on screen. */
  clear: item => ({ seq: openingSeq(item), sel: null, touched: false }),
  /* Every other mode shows a disabled "Pick an answer" until you act. This one
     alone shipped a live "Submit", so the most discoverable thing on the screen
     was a button that scored a scrambled opening — roughly zero — before the
     player had moved a single card. A move is now required. */
  ready: v => !!v.touched,
  score: (item, v) => {
    // Proper Kendall tau: (concordant - discordant) / total, which runs -1..+1 and
    // is clamped to 0. The previous version used concordant/total, which is
    // (tau+1)/2 — that floors a RANDOM shuffle at about 50 and gave two swaps an
    // undeserved 80. Now: perfect 100, one swap 80, two swaps 60, random 0.
    const vals = v.seq.map(i => item.items[i][1]);
    let c = 0, d = 0;
    for (let i = 0; i < vals.length; i++)
      for (let j = i + 1; j < vals.length; j++) (before(item, vals[i], vals[j]) ? c++ : d++);
    return c + d ? Math.max(0, Math.round(100 * (c - d) / (c + d))) : 0;
  },
  /** Pairs right, for the explanation line under the score. A bare number that
   *  contradicts four red cards is what made this confusing in the first place. */
  detail: (item, v) => {
    const vals = v.seq.map(i => item.items[i][1]);
    let c = 0, t = 0;
    for (let i = 0; i < vals.length; i++)
      for (let j = i + 1; j < vals.length; j++) { t++; if (before(item, vals[i], vals[j])) c++; }
    return `${c} of ${t} pairs in the right order`;
  },
  Component: ({ item, value, setValue, revealed }) => {
    const truthOrder = item.items.map((_, i) => i).sort((a, b) => (item.items[b][1] - item.items[a][1]) * dirOf(item));
    /* On reveal the cards used to stay in YOUR order with values bolted on, so to
       learn the answer you had to re-sort five cards in your head. Now they
       animate into the CORRECT order and each keeps a tag saying where you had
       put it — you see both the truth and your mistake at once. framer's `layout`
       does the FLIP; the keys are stable so it tracks each card across the move. */
    const shown = revealed ? truthOrder : value.seq;
    const listRef = useRef(null);
    // from  = where the dragged card started this gesture
    // moved = has the pointer travelled far enough to be a drag rather than a tap?
    const drag = useRef({ from: null, moved: false, y0: 0 });

    /** Which card position is under this Y coordinate? Measured from live rects
     *  rather than from an assumed row height, because the cards are not all the
     *  same height once a long label wraps. */
    const posAtY = y => {
      const cards = listRef.current?.querySelectorAll('.ocard') || [];
      for (let i = 0; i < cards.length; i++) {
        const r = cards[i].getBoundingClientRect();
        if (y < r.bottom) return i;
      }
      return cards.length - 1;
    };

    const onDown = (pos, e) => {
      if (revealed) return;
      drag.current = { from: pos, moved: false, y0: e.clientY };
      // Guarded: setPointerCapture throws NotFoundError when the pointer id is no
      // longer active, and an unguarded throw here aborts the rest of the handler.
      try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* fine */ }
    };

    const onMove = e => {
      const d = drag.current;
      if (d.from === null || revealed) return;
      // 6px of slop so a slightly shaky tap is still a tap.
      if (!d.moved && Math.abs(e.clientY - d.y0) < 6) return;
      d.moved = true;
      const to = posAtY(e.clientY);
      const from = d.from;          // read BEFORE the updater, not inside it
      if (to === from) return;
      d.from = to;
      setValue(prev => {
        const seq = prev.seq.slice();
        // Lift and re-insert, not swap: dragging past two cards should slide them
        // both up by one, which is what the gesture looks like it is doing.
        // `from` is a local: React runs this updater later, by which time
        // drag.current.from has already advanced, so reading the ref in here
        // spliced the wrong card and the drag stalled after one step.
        const [card] = seq.splice(from, 1);
        seq.splice(to, 0, card);
        return { seq, sel: null, touched: true };
      });
    };

    const onUp = pos => {
      const d = drag.current;
      drag.current = { from: null, moved: false, y0: 0 };
      if (revealed || d.moved) return;        // a real drag already did its work
      setValue(prev => {                      // otherwise it was a tap
        // Selecting a card is not yet an answer — only an actual swap is, so
        // `touched` is set on the swap branch alone.
        if (prev.sel === null) return { ...prev, sel: pos };
        if (prev.sel === pos) return { ...prev, sel: null };   // tap again to cancel
        const seq = prev.seq.slice();
        [seq[prev.sel], seq[pos]] = [seq[pos], seq[prev.sel]];
        return { seq, sel: null, touched: true };   // selection always clears after a swap
      });
    };

    return (
      <div className="m-order">
        <div className="olist" ref={listRef}>
          {shown.map((oi, pos) => {
            const [label, val, emo] = item.items[oi];
            const yourPos = value.seq.indexOf(oi);
            const right = yourPos === pos;
            return (
              <motion.button key={label} layout disabled={revealed}
                transition={{ type: 'spring', stiffness: 420, damping: 34, delay: revealed ? pos * 0.06 : 0 }}
                className={'ocard' + (value.sel === pos ? ' sel' : '')
                  + (drag.current.from === pos && drag.current.moved ? ' dragging' : '')
                  + (revealed ? (right ? ' ok' : ' bad') : '')}
                onPointerDown={e => onDown(pos, e)}
                onPointerMove={onMove}
                onPointerUp={() => onUp(pos)}
                onPointerCancel={() => { drag.current = { from: null, moved: false, y0: 0 }; }}
                // Keyboard users never get a pointer event, so give them the tap path.
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onUp(pos); } }}>
                <span className="ogrip" aria-hidden="true">⠿</span>
                {/* SVG, not the system glyph — these include country flags, which
                    Windows renders as two letters. */}
                {emo && <img className="oemo" src={emojiUrl(emo)} alt="" width={22} height={22}
                             onError={e => { e.currentTarget.replaceWith(
                               Object.assign(document.createElement('span'),
                                 { className: 'oemo', textContent: emo })); }} />}
                <span className="orank">{pos + 1}</span>
                <span className="olabel">{label}</span>
                {revealed && <span className="oval">{fmt(val, item.unit)} {item.unit}</span>}
                {revealed && !right && (
                  <span className="omoved" title={`You placed it ${yourPos + 1}`}>
                    {yourPos > pos ? '↑' : '↓'} you had it {yourPos + 1}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
        {!revealed &&
          <p className="orderpreview">
            <span className="sub">Your order</span>{' '}
            {value.seq.map((oi, i) => (
              <span key={oi}><b>{i + 1}</b> {item.items[oi][0]}{i < value.seq.length - 1 ? ' › ' : ''}</span>
            ))}
          </p>}
      </div>
    );
  },
};

/** Years are never abbreviated — "2.0k year" was nonsense where 1980 was meant.
 *  Everything else gets thousands separators rather than k/M/B, which reads more
 *  naturally beside a unit ("10,935 m", "884 kcal"). */
function fmt(v, unit) {
  if (/year/i.test(unit || '') && Math.abs(v) > 1000 && Number.isInteger(v)) return String(v);
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(1) + ' billion';
  if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + ' million';
  if (a >= 1) return v.toLocaleString(undefined, { maximumFractionDigits: a >= 100 ? 0 : 2 });
  return v.toPrecision(2);
}
