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
  cricket:'🏏', auto:'🛺', tajmahal:'🕌', mango:'🥭', curry:'🍛', tiger:'🐅',
  diya:'🪔', rupee:'💰', temple:'🛕', spice:'🌶️',
  sun:'☀️', star:'⭐', football:'⚽', pizza:'🍕', guitar:'🎸', camera:'📷',
  // Added for size questions that were drawing the wrong thing entirely:
  // z18 used a football emoji for BOTH the pitch and the tennis court, and
  // in-z3 compared India's area to the UK's with a globe and a tiger.
  pitch: '\ud83c\udfdf\ufe0f', tenniscourt: '\ud83c\udfbe',
  india: '\ud83c\uddee\ud83c\uddf3', uk: '\ud83c\uddec\ud83c\udde7',
  tv: '\ud83d\udcfa',
};
