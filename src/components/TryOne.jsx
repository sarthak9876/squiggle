import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SHARE } from '../content/share.js';
import { dayNumber } from '../lib/schedule.js';

/** One playable question, inline on the hero.
 *  A first-time visitor plays in under three seconds without a click-through —
 *  the single highest-leverage thing on a landing page for a game, because the
 *  product IS the demo. Deliberately a slider: no instructions needed. */
export default function TryOne({ onFinish, onPlay, exclude }) {
  /* Never demo a question that is in the player's own daily set. This picked by
     day number alone, so on 1.7% of player-days the hero handed you a question
     you would meet again an hour later with your answer already known — the one
     thing a demo must not do. `exclude` is the same set practice uses. Falls
     back to the whole bank if it ever empties, because a hero with no question
     is worse than a repeated one. */
  const pool = exclude?.size ? SHARE.filter(x => !exclude.has(x.id)) : SHARE;
  const usable = pool.length ? pool : SHARE;
  const q = usable[dayNumber() % usable.length];
  const [val, setVal] = useState(50);
  const [done, setDone] = useState(false);
  const err = Math.abs(val - q.answer);
  const score = Math.max(0, Math.round(100 - err * 2.5));

  return (
    <div className="tryone">
      <p className="tryq">{q.prompt}</p>
      <div className="trydots" aria-hidden="true">
        {Array.from({ length: 50 }, (_, i) => {
          const n = (i + 1) * 2;
          return <span key={i} className={'tdot' + (done && n <= q.answer ? ' truth' : '') + (n <= val ? ' mine' : '')} />;
        })}
      </div>
      <input type="range" min="0" max="100" value={val} disabled={done}
             onChange={e => setVal(+e.target.value)}
             aria-label={q.prompt} className="tryslider" />
      <AnimatePresence mode="wait">
        {!done ? (
          <motion.button key="go" className="btn btn-ghost trybtn" onClick={() => { setDone(true); onFinish?.(score); }}
            exit={{ opacity: 0 }}>
            Lock in {val}%
          </motion.button>
        ) : (
          <motion.div key="res" className="tryres"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <p className="trynum">
              You said <b>{val}%</b> · it is <b className="t">{q.answer}%</b>
            </p>
            <p className="trynote">{q.note}</p>
            {/* This is the highest-intent moment on the landing page: the
                player has just answered something and seen the real number.
                It used to end here, with no way forward — the demo sold the
                game and then dropped the person holding it. */}
            {onPlay && (
              <button type="button" className="btn btn-primary wide tryplay" onClick={onPlay}>
                Play today's 16
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
