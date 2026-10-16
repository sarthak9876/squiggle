import { motion } from 'framer-motion';

/* THE LOGO.

   Replaces a 📐 emoji, which said "geometry homework" rather than "guess the
   world", and rendered differently on every platform.

   The mark is the game: a hand-drawn curve that is your hunch, and a dot that is
   where the answer actually was. They are close but they do not touch — which is
   the whole product in one glyph. It reads at 16px as a favicon and at 300px as
   a hero, because it is two shapes and nothing else.

   Deliberately NOT called `.mark`: that class already belonged to the Place The
   Dot chart marker (position:absolute; top:0), and because game.css imports after
   home.css the hero logo inherited it and floated up onto the header, crossing
   straight through the wordmark. */
export default function SquiggleMark({ size = 40, animate = true, className = '' }) {
  const draw = animate
    ? { initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 },
        transition: { duration: 1.1, ease: [0.22, 0.9, 0.3, 1] } }
    : {};
  const pop = animate
    ? { initial: { scale: 0 }, animate: { scale: 1 },
        transition: { delay: 0.75, type: 'spring', stiffness: 380, damping: 14 } }
    : {};
  return (
    <svg className={'sqmark ' + className} viewBox="0 0 48 48"
         width={size} height={size} fill="none" aria-hidden="true">
      {/* Your guess: an arc that rises and falls, drawn by hand. */}
      <motion.path
        d="M5 36C10 36 12 14 22 13s13 19 21 11"
        stroke="var(--ink)" strokeWidth="4.2" strokeLinecap="round" {...draw} />
      {/* The truth: near the curve, never on it. */}
      <motion.circle cx="37" cy="31" r="5" fill="var(--accent)" {...pop} />
    </svg>
  );
}

/* The hero curve, alive.

   It draws itself in, then keeps breathing: a slow horizontal drift with a slight
   vertical bob, so the wave looks like it is crawling rather than sitting there.
   The dot rides the crest a beat behind the curve, which is what sells the
   caterpillar — a rigid body would read as a logo, a trailing one reads as a
   creature.

   Two separate animations rather than one: the DASH offset moves along the path
   (the crawl) and the group translates (the drift). Doing it with one would make
   the curve stretch instead of travel.

   prefers-reduced-motion stops the loop and leaves the finished curve. */
export function SquiggleHero({ width = 300 }) {
  return (
    <svg className="sqhero" viewBox="0 0 300 92" width={width} height={width * 92 / 300}
         fill="none" aria-hidden="true">
      {/* The idle crawl is CSS, not framer.
          Two reasons. First, framer maps `x`/`y` to SVG ATTRIBUTES for svg
          elements, and <g> has neither — the animation silently set nothing and
          computed transform stayed "none". Second, an infinite decorative loop
          driven by requestAnimationFrame burns a frame callback for as long as the
          tab is open; a CSS keyframe is handed to the compositor and costs nothing.
          Reduced motion is handled in the stylesheet, where it belongs. */}
      <g className="crawl">
        <motion.path
          d="M10 68C46 68 50 20 86 20s38 54 74 54 40-60 76-60 34 46 44 46"
          stroke="var(--accent)" strokeWidth="7" strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.22, 0.9, 0.3, 1] }} />
        {/* The dot trails the body by a beat — a rigid logo reads as a logo, a
            lagging head reads as a creature. */}
        <motion.circle className="crawlhead" cx="243" cy="36" r="9" fill="var(--ink)"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: 1.1, type: 'spring', stiffness: 340, damping: 13 }} />
      </g>
    </svg>
  );
}
