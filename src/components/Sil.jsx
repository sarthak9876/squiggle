/* A one-colour silhouette of any icon we already ship.

   Why this exists: Size It Up asks "how tall is a tiger compared to a person",
   and it used to draw a full-colour cartoon person beside a full-colour cartoon
   tiger. Two art styles, two orientations, two palettes — the eye compares the
   COLOURS before it compares the heights, which is the one thing the question
   is about. Magnitudle, which does this well, draws a blue reference silhouette
   and a red resizable one. Same idea here.

   How it works, and why there are no new asset files: a CSS mask uses only the
   ALPHA channel of its image, so pointing `mask-image` at the Twemoji SVG we
   already serve yields that shape's outline, filled with whatever
   `background-color` we choose. No second icon set, no extra download, no
   licence change — still the same CC-BY Twemoji, credited in About.

   `currentColor` is deliberately NOT used here: inside an <img>, an SVG is an
   isolated document and does not inherit the page's colour. Masking sidesteps
   that entirely, and lets one asset be grey in the reference slot and accent
   red in the answer slot. */
import Emo from './Emo.jsx';
import { SIL_UNSAFE } from '../content/emoji.js';

export default function Sil({ name, size = 32, tone = 'ink', label, className = '', fallbackToColour = true }) {
  if (!name) return null;
  /* Some shapes do not survive being flattened — four different round things
     all become the same circle, and a flag becomes a blank rectangle. Where the
     picture IS the question (Shapes Only), fall back to the colour icon rather
     than ship an unanswerable tile. Size It Up passes fallbackToColour={false}:
     there the label and the scale carry the meaning, so a consistent two-tone
     comparison matters more than the inner detail. */
  if (fallbackToColour && SIL_UNSAFE.has(name))
    return <Emo name={name} size={size} alt={label ?? name} className={className} />;
  const url = `url(/emoji/${name}.svg)`;
  return (
    <span
      className={`sil sil-${tone} ${className}`}
      /* `--icon` lets the surrounding CSS size the artwork responsively; the
         `size` prop stays the default for every caller that does not set it. */
      style={{
        width: `var(--icon, ${size}px)`, height: `var(--icon, ${size}px)`,
        WebkitMaskImage: url, maskImage: url,
      }}
      /* The shape carries meaning, so it needs a name for anyone who cannot see
         it — the same reason the Shapes Only tiles have aria-labels. */
      role="img"
      aria-label={label ?? name}
    />
  );
}
