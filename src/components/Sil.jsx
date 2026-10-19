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
export default function Sil({ name, size = 32, tone = 'ink', label, className = '' }) {
  if (!name) return null;
  const url = `url(/emoji/${name}.svg)`;
  return (
    <span
      className={`sil sil-${tone} ${className}`}
      style={{
        width: size, height: size,
        WebkitMaskImage: url, maskImage: url,
      }}
      /* The shape carries meaning, so it needs a name for anyone who cannot see
         it — the same reason the Shapes Only tiles have aria-labels. */
      role="img"
      aria-label={label ?? name}
    />
  );
}
