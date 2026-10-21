import { useState } from 'react';
import { BRAND } from '../brand.js';
import { motion } from 'framer-motion';
import { dayNumber, dateOfDay, archiveDays, puzzleNumber, SLOTS } from '../lib/schedule.js';
import { load } from '../lib/storage.js';

/* Was a local copy of dateOfDay's arithmetic. Two places computing the same
   date from the same epoch is one place too many — when the day math moved to
   UTC, a private copy would have silently kept the old answer. Use the one. */
const iso = d => dateOfDay(d).toISOString().slice(0, 10);
/* timeZone: 'UTC' because dateOfDay returns UTC midnight; without it a player
   in New York sees every archive tile labelled with the previous day. */
const label = d => dateOfDay(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** ARCHIVE — every past day, replayable.
 *  Shows your score where you have one, so the grid doubles as a heatmap of how
 *  you have been doing. Days you missed are still playable; they just never count
 *  towards the streak, which is what keeps the streak meaningful. */
export default function Archive({ onPlayDay, onHome }) {
  const today = dayNumber();
  const s = load();
  const PAGE = 90;
  const [shown, setShown] = useState(PAGE);
  /* Launch day is the floor and YESTERDAY is the ceiling — see isArchiveDay.
     This loop used to start at `today`, which let a player read today's sixteen
     answers in a run that does not count, then play the daily knowing them. */
  const all = archiveDays(today);
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
          {/* > 0, not > 1: with today excluded, the day after launch has exactly
              one playable day and was being told there was nothing here yet. */}
          {days.length > 0
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
                      aria-label={`${BRAND.name} #${n}, ${label(d)}${total != null ? `, scored ${total} out of ${SLOTS.length * 100}` : ', not played'}`}>
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
