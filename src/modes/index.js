import { draw }   from './draw.jsx';
import { order }  from './order.jsx';
import { place }  from './place.jsx';
import { share }  from './share.jsx';
import { odd }    from './odd.jsx';
import { groups } from './groups.jsx';
import { shadow } from './shadow.jsx';
import { size }   from './size.jsx';

import { DRAW }   from '../content/draw.js';
import { ORDER }  from '../content/order.js';
import { PLACE }  from '../content/place.js';
import { SHARE }  from '../content/share.js';
import { ODD }    from '../content/odd.js';
import { GROUPS } from '../content/groups.js';
import { SHADOW } from '../content/shadow.js';
import { SIZE }   from '../content/size.js';

export const MODES = { draw, order, place, share, odd, groups, shadow, size };

/* THE GAME IS GLOBAL. A question tagged with a `region` needs local knowledge to
   answer — "which of these does India grow the most of", "longest Indian river
   first", "most Test runs" — and the players are 16-45 worldwide.

   The bank was built India-first: 74 of 361 questions carry region:'india',
   including a whole parallel set with `in-` ids. Capping them at one a day was
   not enough, and could not be. One a day means a player in Lagos or São Paulo
   meets a question about Indian states or cricket in EVERY set they ever play,
   and the dealer relaxes the cap anyway rather than leave a slot empty (see
   schedule.js). The only honest fix for a global audience is that these never
   enter the pool.

   They are FILTERED, not deleted. The content stays in the repo, still tagged,
   so an India edition — or a Nigerian or Brazilian one — is a locale switch
   here rather than a rewrite.

   This is not "no question may mention India". A question is global when anyone
   can answer it: India's population, where India sits on internet use against
   median age, the rupee among four currencies, Delhi among the five biggest
   cities. Twelve questions carried the tag only because India was one reference
   dot among five — those were untagged, not filtered. */
const global = pool => pool.filter(q => !q.region);

export const POOLS = { draw: global(DRAW), order: global(ORDER), place: global(PLACE),
                       share: global(SHARE), odd: global(ODD), groups: global(GROUPS),
                       shadow: global(SHADOW), size: global(SIZE) };

/** Every question, region packs included. For tooling — the CSV export and the
 *  content linter check what is AUTHORED, not what today's locale ships. */
export const ALL_POOLS = { draw: DRAW, order: ORDER, place: PLACE, share: SHARE,
                           odd: ODD, groups: GROUPS, shadow: SHADOW, size: SIZE };

/** Prompt text lives under different keys across the pools for historical reasons;
 *  one accessor keeps that detail out of every component. */
export const promptOf = item => item.prompt || item.question || '';
export const noteOf   = item => item.note || '';
export const sourceOf = item => item.source || '';
/* Optional one-line context for a question that names something a player may
   never have heard of. Absent on most questions — the hint button only appears
   where this is set, so adding one is a content decision, not a code change. */
export const hintOf   = item => item.hint || '';
