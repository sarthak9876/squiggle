/* The game registry.
   Each game owns its name, its one-line rule, its accent colour and its icon.
   Icons are hand-built SVG rather than emoji so each one can ANIMATE to show what
   the game actually does — the curve draws itself, the cards shuffle, the dot
   drops. A still emoji cannot explain a mechanic; a three-frame loop can. */

const S = { viewBox: '0 0 48 48', fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };

export const ICONS = {
  draw: ({ c }) => (
    <svg {...S} className="gi gi-draw" aria-hidden="true">
      <path d="M6 40h36M8 40V8" stroke="var(--rule-strong)" strokeWidth="2" />
      <path className="gi-curve" d="M9 34C16 34 18 14 24 14s9 16 15 16"
            stroke={c} strokeWidth="3.4" pathLength="100" />
      <circle className="gi-dot" cx="9" cy="34" r="3.2" fill={c} />
    </svg>
  ),
  order: ({ c }) => (
    <svg {...S} className="gi gi-order" aria-hidden="true">
      <rect className="gi-card gi-c1" x="9"  y="9"  width="30" height="8" rx="3" fill={c} />
      <rect className="gi-card gi-c2" x="9"  y="20" width="30" height="8" rx="3" fill={c} opacity=".62" />
      <rect className="gi-card gi-c3" x="9"  y="31" width="30" height="8" rx="3" fill={c} opacity=".34" />
    </svg>
  ),
  place: ({ c }) => (
    <svg {...S} className="gi gi-place" aria-hidden="true">
      <path d="M9 39h32M9 39V8" stroke="var(--rule-strong)" strokeWidth="2" />
      <circle cx="18" cy="30" r="2.4" fill="var(--ink-faint)" />
      <circle cx="31" cy="17" r="2.4" fill="var(--ink-faint)" />
      <circle className="gi-drop" cx="25" cy="25" r="5" fill={c} />
    </svg>
  ),
  share: ({ c }) => (
    <svg {...S} className="gi gi-share" aria-hidden="true">
      <rect x="7" y="20" width="34" height="9" rx="4.5" fill="var(--rule)" />
      <rect className="gi-fill" x="7" y="20" width="34" height="9" rx="4.5" fill={c} />
      <circle className="gi-knob" cx="24" cy="24.5" r="7" fill="var(--paper-2)" stroke={c} strokeWidth="3" />
    </svg>
  ),
  odd: ({ c }) => (
    <svg {...S} className="gi gi-odd" aria-hidden="true">
      <circle cx="16" cy="16" r="6" fill="var(--ink-faint)" />
      <circle cx="32" cy="16" r="6" fill="var(--ink-faint)" />
      <circle cx="16" cy="32" r="6" fill="var(--ink-faint)" />
      <rect className="gi-odd-one" x="26" y="26" width="12" height="12" rx="3" fill={c} />
    </svg>
  ),
  groups: ({ c }) => (
    <svg {...S} className="gi gi-groups" aria-hidden="true">
      <rect className="gi-g gi-g1" x="7"  y="10" width="11" height="11" rx="3" fill={c} />
      <rect className="gi-g gi-g2" x="19" y="10" width="11" height="11" rx="3" fill={c} opacity=".55" />
      <rect className="gi-g gi-g3" x="31" y="10" width="11" height="11" rx="3" fill="var(--ink-faint)" />
      <rect className="gi-g gi-g4" x="7"  y="27" width="11" height="11" rx="3" fill="var(--ink-faint)" />
      <rect className="gi-g gi-g5" x="19" y="27" width="11" height="11" rx="3" fill={c} opacity=".55" />
      <rect className="gi-g gi-g6" x="31" y="27" width="11" height="11" rx="3" fill={c} />
    </svg>
  ),
  shadow: ({ c }) => (
    <svg {...S} className="gi gi-shadow" aria-hidden="true">
      <path className="gi-sil" d="M12 36c0-9 5-16 12-16s12 7 12 16z" fill={c} />
      <circle className="gi-sil2" cx="24" cy="15" r="6.5" fill={c} opacity=".55" />
    </svg>
  ),
  size: ({ c }) => (
    <svg {...S} className="gi gi-size" aria-hidden="true">
      <circle className="gi-small" cx="14" cy="30" r="6" fill={c} opacity=".5" />
      <circle className="gi-big"   cx="32" cy="26" r="11" fill={c} />
    </svg>
  ),
};

export const GAMES = {
  shadow: { key:'shadow', name:'Shapes Only',   rule:'Four pictures, no labels. Pick one.',
            how:'Tap the picture that answers the question. Nothing to read.',
            colour:'var(--g-shadow)', order:1 },
  size:   { key:'size',   name:'Size It Up',    rule:'Scale one thing against another.',
            how:'Drag the slider until the two match. Weight and area questions are drawn to scale, not to length.',
            colour:'var(--g-size)', order:2 },
  groups: { key:'groups', name:'Make The Sets', rule:'Nine things, three hidden sets.',
            how:'Tap three that belong together. They lock. Tap a locked set to break it.',
            colour:'var(--g-groups)', order:3 },
  draw:   { key:'draw',   name:'Draw The Curve',rule:'Freehand real data on blank axes.',
            how:'Drag across the chart, left to right. The real data appears over your line.',
            colour:'var(--g-draw)', order:4 },
  place:  { key:'place',  name:'Place The Dot', rule:'Drop a thing between two axes.',
            how:'Tap where it belongs. The grey dots are there to help you judge it.',
            colour:'var(--g-place)', order:5 },
  share:  { key:'share',  name:'What Share?',   rule:'Guess a percentage. No sums.',
            how:'Drag the slider until the dots look right.',
            colour:'var(--g-share)', order:6 },
  odd:    { key:'odd',    name:'Odd One Out',   rule:'Spot it, then say why.',
            how:'Pick the one that does not fit, then pick the reason. Both halves score.',
            colour:'var(--g-odd)', order:7 },
  order:  { key:'order',  name:'Put In Order',  rule:'Five cards, right sequence.',
            how:'Drag a card to move it — or tap two cards to swap them.',
            colour:'var(--g-order)', order:8 },
};

export const GAME_LIST = Object.values(GAMES).sort((a, b) => a.order - b.order);
