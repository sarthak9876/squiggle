import { SIL } from '../content/emoji.js';

/* ONE emoji renderer, backed by local SVGs.

   System emoji looked different on every platform — and on Windows a flag is not
   rendered at all, it falls back to two letters ("IN", "GB"). When the answer
   depends on recognising the picture, that is a correctness bug, not a style one.

   These are Twemoji (CC-BY 4.0, credited in About), downloaded at build time and
   served from this origin. Identical on Samsung, Pixel, iPhone, Windows and in
   the share card.

   The alt text carries the key, so a screen reader hears "whale" rather than
   nothing — the same fix as the Shapes Only aria-labels. */
export default function Emo({ name, size = 32, alt, className = '' }) {
  if (!name) return null;
  return (
    <img
      className={'emo-img ' + className}
      src={`/emoji/${name}.svg`}
      width={size}
      height={size}
      alt={alt ?? name}
      draggable="false"
      loading="lazy"
      /* If an SVG is ever missing, fall back to the system glyph rather than
         showing a broken-image icon in the middle of a question. */
      onError={e => {
        const span = document.createElement('span');
        span.textContent = SIL[name] || '';
        span.style.fontSize = size + 'px';
        e.currentTarget.replaceWith(span);
      }}
    />
  );
}
