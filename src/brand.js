/* THE BRAND, in one place.

   The old name was hardcoded into nineteen files — the title, the share text, the
   storage key, the canvas card, the service worker. Renaming meant a grep and a
   prayer. Everything user-visible now reads from here, so the next rename is a
   one-line change and a rebuild.

   The name lives here and nowhere else, which is how it got changed twice in an
   afternoon without a single grep. */
export const BRAND = {
  name: 'Squiggle',
  tagline: 'Eight ways to be wrong about the world',
  // Used in share text and the card footer. No protocol — it is printed, not linked.
  domain: 'squiggle.game',
  url: 'https://squiggle.game/',
  // Storage namespace. Bumping this is a reset for every player, so it changes
  // only when the saved shape genuinely changes — not when the name does.
  storageKey: 'squiggle.v3',
  reportEmail: 'hello@squiggle.game',
};

export default BRAND;
