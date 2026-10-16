import { useState } from 'react';
import { motion } from 'framer-motion';

/* SQUIGGLE, the mascot: a hand-drawn line that reacts to how you did.
   Drawn as one SVG path rather than an emoji or an image so it can MORPH between
   moods — the whole point of a mascot is that it is the same creature feeling
   differently, which a swapped PNG cannot sell. */

const MOODS = {
  happy:   { mouth: 'M 26 44 Q 40 56 54 44', brow: 'M 24 26 Q 30 22 36 25  M 44 25 Q 50 22 56 26', tilt: -4 },
  neutral: { mouth: 'M 27 48 L 53 48',       brow: 'M 24 27 L 36 27  M 44 27 L 56 27',             tilt: 0 },
  meh:     { mouth: 'M 26 50 Q 40 46 54 50', brow: 'M 24 25 Q 30 27 36 26  M 44 26 Q 50 27 56 25', tilt: 3 },
  sad:     { mouth: 'M 26 52 Q 40 42 54 52', brow: 'M 24 23 Q 30 28 36 27  M 44 27 Q 50 28 56 23', tilt: 5 },
  wow:     { mouth: 'M 40 48 m -8 0 a 8 9 0 1 0 16 0 a 8 9 0 1 0 -16 0', brow: 'M 23 22 Q 30 18 37 22  M 43 22 Q 50 18 57 22', tilt: 0 },
};

/* Five bands, not four, and the top one is reserved for 95+ so a near-perfect
   answer does not wear the same face as a merely good one. The old mapping gave
   96, 98 and 100 an identical expression. */
export const moodFor = score =>
  score >= 95 ? 'wow'
  : score >= 65 ? 'happy'
  : score >= 40 ? 'neutral'
  : score >= 15 ? 'meh'
  : 'sad';

export default function Mascot({ mood = 'neutral', size = 72, say }) {
  const m = MOODS[mood] || MOODS.neutral;
  const [poked, setPoked] = useState(false);
  const still = typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Hovering it should feel like poking a creature, not like hovering a picture.
     It leans in, blinks and bounces once. `whileHover` would restart on every
     pointer jitter inside the shape, so a one-shot flag drives it instead and
     resets on leave. The whole thing is decorative, so it stays aria-hidden and
     is skipped under prefers-reduced-motion. */
  const react = poked && !still;

  return (
    <div className="mascot" style={{ width: size }}
         onPointerEnter={() => setPoked(true)}
         onPointerLeave={() => setPoked(false)}>
      <motion.svg viewBox="0 0 80 80" width={size} height={size} aria-hidden="true"
        animate={{
          rotate: react ? [m.tilt, m.tilt - 9, m.tilt + 6, m.tilt] : m.tilt,
          y: mood === 'wow' ? [-2, -8, -2] : react ? [0, -6, 0] : 0,
          scale: react ? [1, 1.08, 1] : 1,
        }}
        transition={{
          y: { duration: .5, repeat: mood === 'wow' ? 2 : 0 },
          rotate: { duration: react ? .5 : .3 },
          scale: { duration: .45, ease: 'easeOut' },
        }}>
        {/* The squiggle itself: an open loop, deliberately not a closed circle. */}
        <motion.path
          d="M 12 44 C 6 20 26 6 40 10 C 58 15 74 28 68 46 C 63 62 44 74 28 68 C 18 64 14 56 18 50"
          fill="var(--paper)" stroke="var(--ink)" strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .7 }} />
        {/* Eyes blink on poke by animating `ry` — the ellipse's own radius —
            rather than a scaleY transform. Same lesson the hero taught: framer
            drives SVG ATTRIBUTES reliably and SVG transforms unreliably, and a
            scaleY on <ellipse> produced computed transform "none". `ry` is a real
            animatable attribute, so it just works, and squashing the radius is a
            truer blink than scaling the whole shape anyway. */}
        {/* `initial` AND the static attribute both carry 3.2. Without a starting
            value framer has nothing to animate FROM and writes ry="undefined" on
            the first frame, which the browser rejects — eight console errors and
            an eye that vanishes for a beat. Exactly the trap the mascot's mouth
            path hit earlier with d="undefined". */}
        <motion.ellipse cx="31" cy="35" rx="3.2" ry={3.2} fill="var(--ink)"
          initial={{ ry: 3.2 }} animate={{ ry: react ? [3.2, 0.4, 3.2] : 3.2 }}
          transition={{ duration: .34, times: [0, .5, 1] }} />
        <motion.ellipse cx="49" cy="35" rx="3.2" ry={3.2} fill="var(--ink)"
          initial={{ ry: 3.2 }} animate={{ ry: react ? [3.2, 0.4, 3.2] : 3.2 }}
          transition={{ duration: .34, times: [0, .5, 1], delay: .04 }} />
        {/* Brow and mouth are SWAPPED, not tweened. Framer cannot interpolate `d`
            between paths with different commands - happy's mouth is one quadratic,
            wow's is two arcs - and it emitted d="undefined" on the first frame,
            which the browser rejects outright. Keying on the mood swaps the
            element and fades it instead, which is animatable and reads the same. */}
        <motion.path key={mood + '-brow'} d={m.brow} stroke="var(--ink)" strokeWidth="2.4"
          fill="none" strokeLinecap="round"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .2 }} />
        <motion.path key={mood + '-mouth'} d={m.mouth} stroke="var(--ink)" strokeWidth="2.8"
          fill="none" strokeLinecap="round"
          initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }}
          style={{ transformOrigin: '40px 48px' }} transition={{ duration: .2 }} />
      </motion.svg>
      {say && <span className="mascotsay">{say}</span>}
    </div>
  );
}
