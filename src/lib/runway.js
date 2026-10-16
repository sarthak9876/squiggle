/* Content runway.

   The bank drains at a fixed rate — two questions per game per day — so "how many
   days of content is left" is a number the project should know about itself rather
   than something someone notices when a player complains about repeats. */
import { SLOTS } from './schedule.js';

export function runway(pools) {
  const perDay = {};
  for (const m of SLOTS) perDay[m] = (perDay[m] || 0) + 1;
  const rows = Object.entries(pools).map(([key, pool]) => ({
    key, count: pool.length, perDay: perDay[key] || 1,
    days: Math.floor(pool.length / (perDay[key] || 1)),
  })).sort((a, b) => a.days - b.days);
  return { rows, days: rows[0]?.days ?? 0, thinnest: rows[0]?.key };
}

/** Warn in the console when any game is within two weeks of repeating itself.
 *  Deliberately console-only: a player should never see an operational warning. */
export function checkRunway(pools, threshold = 14) {
  const r = runway(pools);
  if (r.days < threshold) {
    const low = r.rows.filter(x => x.days < threshold)
      .map(x => `${x.key} ${x.count} (${x.days}d)`).join(', ');
    console.warn(
      `[squiggle] Content runway is ${r.days} days. Below ${threshold}. Top up: ${low}`
    );
  }
  return r;
}
