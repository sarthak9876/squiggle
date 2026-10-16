/* THE BRAND, in one place.

   The old name was hardcoded into nineteen files — the title, the share text, the
   storage key, the canvas card, the service worker. Renaming meant a grep and a
   prayer. Everything user-visible now reads from here, so the next rename is a
   one-line change and a rebuild.

   Why "Hunch": the game is not about knowing, it is about the guess you make
   before you know. "I have a hunch" is exactly the move every one of the eight
   games asks for, it is one syllable, it reads the same in Indian and global
   English, and it leaves room for the tagline to carry the joke. */
export const BRAND = {
  name: 'Hunch',
  tagline: 'Eight ways to be wrong about the world',
  // Used in share text and the card footer. No protocol — it is printed, not linked.
  domain: 'hunch.game',
  url: 'https://hunch.game/',
  // Storage namespace. Bumping this is a reset for every player, so it changes
  // only when the saved shape genuinely changes — not when the name does.
  storageKey: 'hunch.v1',
  reportEmail: 'hello@hunch.game',
};

export default BRAND;
