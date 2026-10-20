/* Visual library — EMOJI, not vector art.

   This file previously held hand-authored SVG paths (the dog read as a pig), then
   traced CC-BY icons from game-icons.net (better, but the elephant and horse were
   still unreadable at thumbnail size and at an odd angle). Emoji won on every axis
   that matters here:

     · recognisability is their entire design purpose — they are drawn to be read
       instantly at text size, which is exactly our constraint
     · zero bytes, zero requests, zero licensing, zero attribution burden
     · colour, which flat silhouettes cannot give, and which this audience expects

   The trade is that they render per-platform (Apple / Noto / Segoe differ). That is
   acceptable: every platform's version is still obviously an elephant, which is more
   than either previous approach achieved.

   Anything with a known variation-selector or gender problem is avoided. Keep new
   entries to widely-supported Unicode 12 or earlier so older Android renders them.

   ⚠️ FULL BODY, NOT FACES. Several animals ship as a head-only emoji (🐴 horse face,
   🦁 lion face) and those are useless in SIZE, where you scale a whole animal against
   a whole person. Prefer the full-body variant: 🐎 not 🐴, 🐈 not 🐱, 🐕 not 🐶. */
export const SIL_IS_EMOJI = true;
export const SIL = {
  /* creatures */
  human:'🧍', elephant:'🐘', whale:'🐋', cat:'🐈', dog:'🐕', horse:'🐎',
  mouse:'🐁', rabbit:'🐇', falcon:'🦅', penguin:'🐧', shark:'🦈', giraffe:'🦒',
  tortoise:'🐢', cheetah:'🐆', chicken:'🐔', lion:'🦁',  /* face-only: never use in SIZE */ dolphin:'🐬',
  /* movement */
  car:'🚗', bus:'🚌', bicycle:'🚲', train:'🚂', plane:'✈️', rocket:'🚀',
  boat:'⛵', motorcycle:'🏍️',
  /* places + objects */
  tree:'🌳', mountain:'⛰️', pyramid:'🔺', house:'🏠', bottle:'🍾', cup:'☕',
  phone:'📱', key:'🔑', crown:'👑', leaf:'🍃', apple:'🍎', banana:'🍌',
  book:'📖', lightbulb:'💡', clock:'⏰', drop:'💧', earth:'🌍', moon:'🌕',
  /* India set */
  cricket:'🏏', auto:'🛺', tajmahal:'🏛️', mango:'🥭', curry:'🍛', tiger:'🐅',
  diya:'🪔', rupee:'💰', temple:'🛕', spice:'🌶️',
  sun:'☀️', star:'⭐', football:'⚽', pizza:'🍕', guitar:'🎸', camera:'📷',
  // Added for size questions that were drawing the wrong thing entirely:
  // z18 used a football emoji for BOTH the pitch and the tennis court, and
  // in-z3 compared India's area to the UK's with a globe and a tiger.
  pitch: '\ud83c\udfdf\ufe0f', tenniscourt: '\ud83c\udfbe',
  india: '\ud83c\uddee\ud83c\uddf3', uk: '\ud83c\uddec\ud83c\udde7',
  tv: '\ud83d\udcfa',
};

/* SIL keys are lookup slugs, not words. Shapes Only printed them straight to
   the player — ".cap", the aria-label, and the "You picked the X" line — so the
   reveal read "tajmahal", "tenniscourt" and "uk". Every other mode already
   carries an explicit label beside its key (see size.js); this gives Shapes Only
   the same thing without duplicating a label onto all 64.

   Only the keys where capitalising the first letter is WRONG need an entry.
   Three kinds: glued words, initialisms, and names that are clear in one country
   and opaque in the rest — the audience is 16-45 worldwide, and outside India
   "auto" and "pitch" name nothing. */
export const SIL_NAMES = {
  tajmahal: 'Taj Mahal', tenniscourt: 'Tennis court', lightbulb: 'Light bulb',
  auto: 'Auto-rickshaw', diya: 'Diya (oil lamp)', pitch: 'Cricket pitch',
  uk: 'UK', tv: 'TV',
};

/** Display name for a SIL key. */
export function silLabel(key) {
  return SIL_NAMES[key] || (key ? key[0].toUpperCase() + key.slice(1) : '');
}


/* Icons whose IDENTITY is carried by colour or inner detail, not by outline.

   Audited by rendering all 64 as silhouettes and looking at them: `earth`,
   `football`, `moon` and `tenniscourt` all reduce to the same plain circle;
   `india` and `uk` are flags, so the outline is a bare rounded rectangle and
   the colour IS the content; `cheetah`, `tiger` and `lion` collapse into one
   another as generic big cats; `mango`, `curry`, `book` and `tree` become
   featureless blobs.

   Shapes Only asks you to identify the picture, so a silhouette there would be
   a correctness bug, not a style choice. These keep their colours. */
export const SIL_UNSAFE = new Set([
  'earth', 'football', 'moon', 'tenniscourt',
  'india', 'uk',
  'cheetah', 'tiger', 'lion',
  'mango', 'curry', 'book', 'tree',
]);
