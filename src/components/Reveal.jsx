import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getCrowd } from '../lib/crowd.js';
import { CROWD_ENABLED } from '../lib/flags.js';
import { modeStats } from '../lib/stats.js';

/** CROWD REVEAL.
 *  Your guess, the truth, then where everyone else landed. The third part is the
 *  one that makes being wrong bearable — and it is what turns a score into a story.
 *  Falls back to a simple "x% got this" bar for modes with no number line. */
export default function Reveal({ mode, item, value, score, qid, modeKey }) {
  const [crowd, setCrowd] = useState(null);
  const num = mode.numeric?.(item, value);

  useEffect(() => {
    if (!CROWD_ENABLED) return;
    let alive = true;
    getCrowd(qid, num ? num.truth : 1, num ? num.guess : undefined)
      .then(c => { if (alive) setCrowd(c); });
    return () => { alive = false; };
  }, [qid]);

  /* No backend, so no crowd. Show the player against THEMSELVES instead — true,
     local, and the comparison a returning player is actually making. */
  if (!CROWD_ENABLED) {
    const st = modeStats(modeKey);
    if (!st || st.n < 2) return null;
    return (
      <motion.div className="selfstat"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .3 }}>
        <span>Your best on this game <b>{st.best}</b></span>
        <span className="dot" aria-hidden="true">·</span>
        <span>Your average <b>{st.mean}</b></span>
        {score >= st.best && st.n > 2 && <span className="pb">New best ✨</span>}
      </motion.div>
    );
  }

  if (!crowd) return <div className="crowd skel" aria-hidden="true" />;


  const pct = v => {
    const span = (crowd.hi - crowd.lo) || 1;
    return Math.max(0, Math.min(100, ((v - crowd.lo) / span) * 100));
  };

  return (
    <motion.div className="crowd"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: .35, duration: .4 }}>
      {/* No invented player counts and no invented percentiles. Showing "2,647
          players" and "better than 17%" for data that does not exist is a lie, and
          it contradicted itself on screen. The SHAPE is illustrative and labelled
          as such; getCrowd() keeps its interface for a real backend. */}
      <p className="crowdhead">
        Typical spread of guesses
        <span className="crowdn">Sample — real data coming soon</span>
      </p>

      {num ? (
        <div className="hist">
          <div className="bars">
            {crowd.histogram.map((v, i) => (
              <motion.span key={i} className="bar"
                initial={{ scaleY: 0 }} animate={{ scaleY: Math.max(.04, v) }}
                transition={{ delay: .4 + i * 0.022, duration: .3 }} />
            ))}
          </div>
          {/* When the guess lands near the truth the two labels printed straight
              through each other. Drop "you" to a second row whenever they are
              within 14% of the track, so both stay readable. */}
          {(() => {
            const tp = pct(num.truth), gp = pct(num.guess);
            const stacked = Math.abs(tp - gp) < 14;
            return (
              <div className={'marks' + (stacked ? ' stacked' : '')}>
                <span className="mark truth" style={{ left: tp + '%' }}><i />truth</span>
                <span className="mark mine"  style={{ left: gp + '%' }}><i />you</span>
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="simplebar">
          <motion.span className="fill" initial={{ width: 0 }}
            animate={{ width: crowd.share + '%' }} transition={{ delay: .4, duration: .5 }} />
          {/* The line used to read the same whether you aced it or scored zero,
              so a 0/100 sat under "roughly 60% get this right" and read as praise.
              It now states YOUR outcome first and the crowd second. */}
          <span className="simplelab">
            {score >= 85 ? `You got it — and so do roughly ${crowd.share}%.`
             : score >= 40 ? `You got part of it. Roughly ${crowd.share}% get it clean.`
             : `Roughly ${crowd.share}% get this one. This time you were not among them.`}
            {' '}<i className="illus">(illustrative)</i>
          </span>
        </div>
      )}

      <p className="beat">
        {score >= 85 ? 'Most people are not this close.'
          : score >= 40 ? 'A common place to land.'
          : 'You are in good company — most people miss this one.'}
      </p>
    </motion.div>
  );
}
