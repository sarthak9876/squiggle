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
export const POOLS = { draw: DRAW, order: ORDER, place: PLACE, share: SHARE,
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
