import { useState } from 'react';
import { motion } from 'framer-motion';
import { dayNumber, EPOCH, LAUNCH_DAY, puzzleNumber } from '../lib/schedule.js';
import { load } from '../lib/storage.js';

const dateOf = d => new Date(EPOCH.getTime() + d * 86400000);
const iso = d => dateOf(d).toISOString().slice(0, 10);
const label = d => dateOf(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** ARCHIVE — every past day, replayable.
 *  Shows your score where you have one, so the grid doubles as a heatmap of how
 *  you have been doing. Days you missed are still playable; they just never count
 *  towards the streak, which is what keeps the streak meaningful. */
export default function Archive({ onPlayDay, onHome }) {
  const today = dayNumber();
  const s = load();
  const PAGE = 90;
  const [shown, setShown] = useState(PAGE);
  // Launch day is the floor — days before the game existed are not days.
  // Future days are never listed, so the archive can never leak tomorrow's set.
  const all = [];
  for (let d = today; d >= LAUNCH_DAY; d--) all.push(d);
  // "Every past set, still playable" has to stay true past day 90, so the rest
  // loads on demand rather than being silently cut off.
  const days = all.slice(0, shown);
  const more = all.length - days.length;

  const band = total => {
    if (total == null) return '';
    const pct = total / (16 * 100);
    return pct >= 0.8 ? ' a' : pct >= 0.6 ? ' b' : pct >= 0.35 ? ' c' : ' d';
  };

  return (
    <motion.div className="archive" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="card">
        <h2 className="shead">Archive</h2>
        <p className="stubtext">
          {days.length > 1
            ? 'Every past set, still playable. Past days never count towards your streak — that is the point of a streak.'
            : 'Nothing here yet — today’s set is the first one. Tomorrow this fills up.'}
        </p>
        <div className="archgrid">
          {days.map(d => {
            // A day you played as an archive run counts for the tile even though
            // it never counted for the streak — otherwise replaying yesterday left
            // the grid showing "–" and looked like the save had failed.
            const total = (s.days || {})[d] ?? ((s.archive || {})[d] || {}).total;
            const fromArchive = (s.days || {})[d] == null && total != null;
            const n = puzzleNumber(d);
            return (
              <button key={d} className={'archday' + band(total) + (d === today ? ' today' : '')}
                      onClick={() => onPlayDay(d)}
                      aria-label={`Squiggle #${n}, ${label(d)}${total != null ? `, scored ${total} out of 1600` : ', not played'}`}>
                <span className="archdate">{label(d)}</span>
                <span className="archnum">#{n}</span>
                <span className="archscore">{total != null ? total : '–'}{fromArchive && <i title="Played from the archive"> ·</i>}</span>
              </button>
            );
          })}
        </div>
      </div>
      {more > 0 && (
        <div className="actions">
          <button className="btn btn-ghost grow" onClick={() => setShown(n => n + PAGE)}>
            Load {Math.min(PAGE, more)} older ({more} left)
          </button>
        </div>
      )}
      <div className="actions">
        <button className="btn btn-ghost grow" onClick={onHome}>← Home</button>
      </div>
    </motion.div>
  );
}
export { iso };
