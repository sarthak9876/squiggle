#!/usr/bin/env node
/* Export every question with its answer and source as CSV, for human fact-checking.
   Usage: node scripts/export-csv.mjs > questions.csv
   Deliberately a separate script, not a build step — the CSV is a review artefact,
   not something the app ships. */
import { DRAW }   from '../src/content/draw.js';
import { ORDER }  from '../src/content/order.js';
import { PLACE }  from '../src/content/place.js';
import { SHARE }  from '../src/content/share.js';
import { ODD }    from '../src/content/odd.js';
import { GROUPS } from '../src/content/groups.js';
import { SHADOW } from '../src/content/shadow.js';
import { SIZE }   from '../src/content/size.js';

const POOLS = { draw: DRAW, order: ORDER, place: PLACE, share: SHARE,
                odd: ODD, groups: GROUPS, shadow: SHADOW, size: SIZE };

const q = s => `"${String(s ?? '').replace(/"/g, '""').replace(/\s+/g, ' ').trim()}"`;

/** One row per question. `answer` is rendered per game type so a reviewer can check
 *  the claim without reading the code. */
function answerOf(key, item) {
  switch (key) {
    case 'share':  return `${item.answer}%`;
    case 'size':   return `${item.answer}x the ${item.ref.label}`;
    case 'shadow': return item.options[item.answer];
    case 'odd':    return `${item.items[item.odd]} — because: ${item.reasons[item.reason]}`;
    case 'order':  return item.items.slice().sort((a, b) => b[1] - a[1])
                       .map(i => `${i[0]} (${i[1]})`).join(' > ');
    case 'groups': return item.groups.map(g => `${g.label}: ${g.items.join('/')}`).join(' | ');
    case 'place':  return `${item.x.label}=${item.answer[0]}, ${item.y.label}=${item.answer[1]}`;
    case 'draw':   return item.points.map(p => `${p[0]}:${p[1]}`).join(' ');
    default:       return '';
  }
}

console.log(['game', 'id', 'question', 'answer', 'note', 'source'].join(','));
for (const [key, pool] of Object.entries(POOLS)) {
  for (const item of pool) {
    console.log([
      q(key), q(item.id), q(item.prompt || item.question),
      q(answerOf(key, item)), q(item.note), q(item.source),
    ].join(','));
  }
}
