import { motion } from 'framer-motion';
import { logScore } from './contract.js';
import { SIL } from '../content/emoji.js';
import Emo from '../components/Emo.jsx';

/* SIZE IT UP — scale one thing against another.
   The slider is LOGARITHMIC because a question can legitimately span 0.19x to 109x,
   and a linear slider would spend 90% of its travel above 100x.
   Both sides scale: whichever is larger fills the stage and the other follows the
   true ratio down to a floor. A fixed reference with a clamped target froze above
   ~3x and only the slider appeared to move — the exact bug this replaced. */
const MIN = 0.05, MAX = 200, STAGE = 150, FLOOR = 10;

/* How a quantity turns into a PICTURE.
   A car is 21x the mass of a person; drawing it 21x wider says it is 21x longer,
   which is false and makes the picture contradict the number beside it. Mass and
   volume go as the cube of length, area as the square, so the drawn scale is the
   matching root. Money and counts have no size at all — those get a bar. */
const DIM_SCALE = {
  length:   r => r,
  area:     r => Math.sqrt(r),
  volume:   r => Math.cbrt(r),
  mass:     r => Math.cbrt(r),
  abstract: () => 1,
};
const visualScale = (item, r) => (DIM_SCALE[item.dimension] || DIM_SCALE.length)(r);
const DIM_WORD = { area: 'the area of', volume: 'the volume of', mass: 'the weight of', abstract: 'the cost of' };

/* The unit says what is being measured, so the label should too. "Person — 1.7 m
   long" was wrong for an upright person, and "1.00x the size of" is meaningless
   on a weight question where the picture is scaled by volume. */
const unitWord = unit => {
  const u = String(unit || '');
  if (/tall|height|at the shoulder/i.test(u)) return 'tall';
  if (/long|length|across|wide/i.test(u)) return 'long';
  return '';
};
const refLabel = item => {
  const w = unitWord(item.unit);
  return w ? `${item.ref.size} ${String(item.unit).replace(/\s*(tall|long|at the shoulder).*/i, '').trim()} ${w}`
           : `${item.ref.size} ${item.unit}`;
};
/* Mass scales as the cube of length, so the drawing is a VOLUME. Say so, or the
   picture and the number look like they disagree. */
const DIM_NOTE = { mass: 'drawn by volume', area: 'drawn by area' };
const toRatio = v => Math.pow(10, Math.log10(MIN) + (v / 1000) * (Math.log10(MAX) - Math.log10(MIN)));
const toSlider = r => Math.round(1000 * (Math.log10(r) - Math.log10(MIN)) / (Math.log10(MAX) - Math.log10(MIN)));
/* Fit BOTH into the stage: the larger fills it, the smaller follows the true
   visual ratio down to a floor where it stays a visible dot rather than vanishing. */
const pair = v => {
  const s = STAGE / Math.max(1, v);
  return { ref: Math.max(FLOOR, s), tgt: Math.max(FLOOR, s * v) };
};

/* The slider used to start dead centre (~3.2x), which sat close to the answer on
   a lot of questions — so submitting without touching anything scored well. It now
   starts at "the same size", and backs off to 0.2x / 5x when the answer itself is
   near 1x, so an untouched slider is ALWAYS at least 2.5x out (logScore <= ~15).
   `touched` then makes that unexploitable: no drag, no Submit. */
const startFor = answer => {
  if (answer > 0.5 && answer < 2) return toSlider(answer >= 1 ? 0.2 : 5);
  return toSlider(1);
};

/* Reference labels are not all bare nouns. "The Moon" already has its article
   ("the the moon") and "Around the Earth" is a prepositional phrase that must not
   get one at all ("the size of the around the earth"). Only a plain noun phrase
   gets "the". */
const NO_ARTICLE = /^(around|across|over|under|per|from|to|in|on|a|an|the)\b/i;
const phrase = label => {
  const l = String(label).trim();
  return (NO_ARTICLE.test(l) ? l : 'the ' + l).toLowerCase();
};

/** ONE rounding rule. The readout and the explanation must never disagree. */
const fmtX = v => (v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : String(Math.round(v)));

export const size = {
  init: item => ({ v: startFor(item.answer), touched: false }),
  clear: item => ({ v: startFor(item.answer), touched: false }),
  ready: v => !!v.touched,
  score: (item, v) => logScore(toRatio(v.v), item.answer),
  signedError: (item, v) => Math.log10(toRatio(v.v) / item.answer) / 2,
  extremity: (_i, v) => Math.abs(v.v - 500) / 500,
  numeric: (item, v) => ({ truth: item.answer, guess: toRatio(v.v) }),
  detail: (item, v) => {
    const g = toRatio(v.v);
    const f = g > item.answer ? g / item.answer : item.answer / g;
    const dir = g > item.answer ? 'too big' : 'too small';
    return f < 1.05 ? 'Within 5% — as good as exact.'
      : `You said ${fmtX(g)}×, the answer is ${fmtX(item.answer)}× — about ${f.toFixed(1)} times ${dir}.`;
  },
  toRatio, toSlider,
  Component: ({ item, value, setValue, revealed }) => {
    const r = toRatio(value.v);
    const abstract = item.dimension === 'abstract';
    const vis = x => visualScale(item, x);
    const shown = revealed ? pair(vis(item.answer)) : pair(vis(r));
    /* The ghost of your guess must be drawn against the TRUTH's scale, not
       re-normalised on its own. pair() always grows the larger side to fill the
       stage, so pair(yourGuess) and pair(truth) came out the same pixel size and
       the ghost sat exactly behind the answer, showing nothing.
       Past ~2.4x the stage it stops being a picture and becomes a wall, so the
       readout carries the number instead. */
    const ghost = shown.ref * vis(r);
    const ghostFits = revealed && ghost <= STAGE * 2.4 && Math.abs(ghost - shown.tgt) > 4;
    return (
      <div className="m-size">
        <p className="readout">
          {/* One number, formatted once, used by the readout AND by detail() — they
              used to round separately and could disagree ("2.9x" next to "within 5%
              of 2.75x"). */}
          <b>{fmtX(r)}×</b>
          <span className="sub"> {DIM_WORD[item.dimension] || 'the size of'} {phrase(item.ref.label)}</span>
          {revealed && <> · <b className="t">actually {fmtX(item.answer)}×</b></>}
          {DIM_NOTE[item.dimension] && <span className="dimnote"> ({DIM_NOTE[item.dimension]})</span>}
        </p>
        <div className="sizestage">
          <div className="sizecell">
            <Emo name={item.ref.key} size={Math.round(shown.ref)} className="emo" />
            <span className="sizelab">{item.ref.label}<br /><b>{refLabel(item)}</b></span>
          </div>
          <div className={'sizecell target' + (revealed ? ' revealed' : '')}>
            {/* An abstract quantity has no size, so it gets a proportional bar
                instead of a picture that would be pretending. */}
            {ghostFits && <Emo name={item.target.key} size={Math.round(Math.max(FLOOR, ghost))} className="ghost" />}
            {/* Springs from the size you guessed to the real one. A snap gives
                you the answer; a spring shows you how far off you were. */}
            <motion.span className="emo" initial={false}
              animate={{ width: Math.round(shown.tgt), height: Math.round(shown.tgt) }}
              transition={{ type: 'spring', stiffness: 170, damping: 22 }}
              style={{ display: 'inline-block' }}>
              <Emo name={item.target.key} size="100%" />
            </motion.span>
            <span className="sizelab">{item.target.label}<br />
              <b>{revealed ? `${item.answer}×` : '?'}</b></span>
          </div>
        </div>
        <input type="range" min="0" max="1000" value={value.v} disabled={revealed}
               onChange={e => setValue({ v: +e.target.value, touched: true })} className="slider"
               aria-label={item.prompt} />
        {abstract && (
          <div className="sizebars" aria-hidden="true">
            <span className="sizebar" style={{ width: `${100 / Math.max(1, r)}%` }} />
            <span className="sizebar t" style={{ width: `${100 * Math.min(1, r)}%` }} />
          </div>
        )}
 {revealed && !ghostFits && Math.abs(ghost - shown.tgt) > 4 &&
          <p className="hintline">Your guess was too far off to draw next to the answer.</p>}
        {!revealed && !value.touched &&
          <p className="hintline">Drag the slider to set your answer.</p>}
      </div>
    );
  },
};
