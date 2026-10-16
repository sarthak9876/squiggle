import { motion } from 'framer-motion';

/* SQUIGGLE, the mascot: a hand-drawn line that reacts to how you did.
   Drawn as one SVG path rather than an emoji or an image so it can MORPH between
   moods — the whole point of a mascot is that it is the same creature feeling
   differently, which a swapped PNG cannot sell. */

const MOODS = {
  happy:   { mouth: 'M 26 44 Q 40 56 54 44', brow: 'M 24 26 Q 30 22 36 25  M 44 25 Q 50 22 56 26', tilt: -4 },
  neutral: { mouth: 'M 27 48 L 53 48',       brow: 'M 24 27 L 36 27  M 44 27 L 56 27',             tilt: 0 },
  sad:     { mouth: 'M 26 52 Q 40 42 54 52', brow: 'M 24 23 Q 30 28 36 27  M 44 27 Q 50 28 56 23', tilt: 5 },
  wow:     { mouth: 'M 40 48 m -8 0 a 8 9 0 1 0 16 0 a 8 9 0 1 0 -16 0', brow: 'M 23 22 Q 30 18 37 22  M 43 22 Q 50 18 57 22', tilt: 0 },
};

export const moodFor = score =>
  score >= 90 ? 'wow' : score >= 60 ? 'happy' : score >= 30 ? 'neutral' : 'sad';

export default function Mascot({ mood = 'neutral', size = 72, say }) {
  const m = MOODS[mood] || MOODS.neutral;
  return (
    <div className="mascot" style={{ width: size }}>
      <motion.svg viewBox="0 0 80 80" width={size} height={size} aria-hidden="true"
        animate={{ rotate: m.tilt, y: mood === 'wow' ? [-2, -8, -2] : 0 }}
        transition={{ y: { duration: .5, repeat: mood === 'wow' ? 2 : 0 }, rotate: { duration: .3 } }}>
        {/* The hunch itself: an open loop, deliberately not a closed circle. */}
        <motion.path
          d="M 12 44 C 6 20 26 6 40 10 C 58 15 74 28 68 46 C 63 62 44 74 28 68 C 18 64 14 56 18 50"
          fill="var(--paper)" stroke="var(--ink)" strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .7 }} />
        <circle cx="31" cy="35" r="3.2" fill="var(--ink)" />
        <circle cx="49" cy="35" r="3.2" fill="var(--ink)" />
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
