import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { logScore } from './contract.js';
import { SIL } from '../content/emoji.js';
import Emo from '../components/Emo.jsx';
import Sil from '../components/Sil.jsx';
import { isMuted } from '../lib/juice.js';
import { hash, rng } from '../lib/random.js';

/* SIZE IT UP — scale one thing against another.

   REDESIGNED after round-3 review found it the weakest of the eight: "a generic
   slider 80px below the thing you're judging, covering 0.05x-200x for every
   question, while the reference you're comparing against shrinks as you drag."
   All three were true. The fixes, in order of how much they mattered:

   1. PER-QUESTION RANGE. One global 0.05x-200x scale meant that for "shark vs
      person" (truth 2.6x) more than half the travel was nonsense and a pixel
      moved you ~1%. The range is now about 4x either side of the truth, so the
      whole slider is live and a pixel is a sensible step.
   2. THE REFERENCE HOLDS STILL. It used to shrink as the target grew, so there
      was no anchor to judge against — at 10x the person was a 6px speck. Now the
      reference is fixed and the CAMERA zooms out, with a badge saying so.
   3. DRAG THE OBJECT. The target is draggable directly; the slider stays as the
      accessible secondary control, bound to the same value.
   4. SAY IT IN OBJECTS. "about 3 people long" beats "3.4x" for a number you are
      supposed to feel. */

const STAGE = 150;          // px the reference occupies, fixed
const FLOOR = 10;
const STEPS = 1000;

/* The travel around the truth, deliberately ASYMMETRIC.

   It used to be t/5 .. t*5. Because the slider interpolates in log space, the
   geometric midpoint of that range is sqrt((t/5)*(t*5)) = t exactly — so
   dragging to dead centre scored 100 on 43 of 44 questions. A player finds that
   once and the mode is over, and it quietly inflated every daily total by up to
   199 of 1600 points (size holds 2 of the 16 slots).

   Now the truth sits at a seeded 25-42% or 58-75% of the travel, never the
   middle, and never the same fraction two questions running. SPAN stays ~1.4
   decades so the feel of the drag is unchanged. Seeded by question id, so it is
   stable across reloads and identical for every player that day. */
export function rangeFor(item) {
  const t = item.answer;
  const gen = rng(hash('size-range:' + String(item.id)));
  const r = gen(), q = gen();
  // Two bands with a gap across 0.5: an `at` near the middle would re-create
  // the exact bug this replaces.
  const at = r < 0.5 ? 0.20 + r * 0.52 : 0.54 + (r - 0.5) * 0.52;
  /* The WIDTH varies per question too, and that is not cosmetic. With a fixed
     span, slider position p always means "truth x 10^((p-at)*SPAN)", so one
     position produced a similar relative error on every question and parking at
     v=370 still beat 14 of 44. Varying the span decouples position from error. */
  const span = 1.05 + q * 0.4;
  let lo = Math.max(0.02, Math.pow(10, Math.log10(t) - at * span));
  let hi = Math.min(400, Math.pow(10, Math.log10(t) + (1 - at) * span));
  // The clamps above narrow the range, so re-assert that the truth stays inside
  // it — otherwise a very small or very large answer becomes unreachable.
  lo = Math.min(lo, t / 1.5);
  hi = Math.max(hi, t * 1.5);
  return { lo, hi };
}

export const toRatio = (v, item) => {
  const { lo, hi } = rangeFor(item);
  return Math.pow(10, Math.log10(lo) + (v / STEPS) * (Math.log10(hi) - Math.log10(lo)));
};
/** How many slider steps equal a given RATIO change on this question's scale.
 *  5% is 5% whether the span is one decade or one and a half. */
export const stepsForRatio = (ratio, item) => {
  const { lo, hi } = rangeFor(item);
  const span = Math.log10(hi) - Math.log10(lo);
  return Math.max(1, Math.round(STEPS * Math.log10(ratio) / span));
};
export const toSlider = (r, item) => {
  const { lo, hi } = rangeFor(item);
  return Math.round(STEPS * (Math.log10(r) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)));
};

/* How a quantity becomes a PICTURE. A car is 21x the MASS of a person; drawing
   it 21x wider would claim it is 21x longer. Mass and volume go as the cube of
   length, area as the square. Money has no size at all. */
const DIM_SCALE = {
  length: r => r, area: r => Math.sqrt(r),
  volume: r => Math.cbrt(r), mass: r => Math.cbrt(r), abstract: () => 1,
};
const visualScale = (item, r) => (DIM_SCALE[item.dimension] || DIM_SCALE.length)(r);
const DIM_WORD = { area: 'the area of', volume: 'the volume of', mass: 'the weight of', abstract: 'the cost of' };
const DIM_NOTE = { mass: 'drawn by volume', area: 'drawn by area' };

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

const NO_ARTICLE = /^(around|across|over|under|per|from|to|in|on|a|an|the)\b/i;
const phrase = label => (NO_ARTICLE.test(String(label).trim()) ? label : 'the ' + label).toLowerCase();
const fmtX = v => (v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : String(Math.round(v)));

/** The sentence a person can picture. "about 3 people long" lands; "3.4x" does not. */
export function livePhrase(item, r) {
  const w = unitWord(item.unit) || 'big';
  const noun = item.ref.label.replace(/^(a|an|the)\s+/i, '').toLowerCase();
  /* "1.4 persons tall" is what a naive +s gives you. The reference labels are a
     closed set, so the handful of irregulars are cheaper to list than to infer. */
  const IRREGULAR = { person: 'people', foot: 'feet', tooth: 'teeth', mouse: 'mice',
                      goose: 'geese', man: 'men', woman: 'women', child: 'children' };
  const plural = IRREGULAR[noun]
    || (/(s|x|z|ch|sh)$/.test(noun) ? noun + 'es'
    :   /[^aeiou]y$/.test(noun) ? noun.slice(0, -1) + 'ies'
    :   noun + 's');
  if (item.dimension === 'abstract') return `about ${fmtX(r)}× the cost`;
  if (item.dimension === 'area')     return `about ${fmtX(r)} ${plural} would fit inside`;
  if (item.dimension === 'mass')     return `about ${fmtX(r)} ${plural} on the scale`;
  if (r < 0.9)  return `smaller than one ${noun}`;
  if (r < 1.15) return `about the same ${w === 'big' ? 'size' : w} as a ${noun}`;
  return `about ${fmtX(r)} ${plural} ${w === 'big' ? 'worth' : w}`;
}

/* Snap points a person actually thinks in. Within 1.5% of one, land on it — with
   a tick so the hand feels it, not just the eye. */
const DETENTS = [0.25, 0.5, 1, 2, 3, 5, 10, 20, 50, 100];
function snap(r, item) {
  const { lo, hi } = rangeFor(item);
  for (const d of DETENTS) {
    if (d < lo || d > hi) continue;
    if (Math.abs(Math.log10(r / d)) < 0.0065) return d;
  }
  return null;
}

export const size = {
  /* Opens at the bottom of the range rather than on the answer, and `touched`
     keeps an unmoved slider unsubmittable. */
  init: item => ({ v: Math.round(STEPS * 0.06), touched: false }),
  clear: item => ({ v: Math.round(STEPS * 0.06), touched: false }),
  ready: v => !!v.touched,
  score: (item, v) => logScore(toRatio(v.v, item), item.answer),
  signedError: (item, v) => Math.log10(toRatio(v.v, item) / item.answer) / 2,
  extremity: (_i, v) => Math.abs(v.v - STEPS / 2) / (STEPS / 2),
  numeric: (item, v) => ({ truth: item.answer, guess: toRatio(v.v, item) }),
  detail: (item, v) => {
    const g = toRatio(v.v, item);
    const f = g > item.answer ? g / item.answer : item.answer / g;
    const dir = g > item.answer ? 'too big' : 'too small';
    return f < 1.05 ? 'Within 5% — as good as exact.'
      : `You said ${fmtX(g)}×, the answer is ${fmtX(item.answer)}× — about ${f.toFixed(1)} times ${dir}.`;
  },
  toRatio, toSlider, rangeFor, livePhrase,

  Component: ({ item, value, setValue, revealed }) => {
    const r = toRatio(value.v, item);
    const abstract = item.dimension === 'abstract';
    const vis = x => visualScale(item, x);
    const shown = revealed ? vis(item.answer) : vis(r);
    const stageRef = useRef(null);
    const drag = useRef(null);
    const lastDetent = useRef(null);
    /* Measured, not assumed. The first attempt zoomed on HEIGHT only, but the
       scene is a row — reference + gap + target — so at 4.6x it overflowed
       sideways and clipped the reference off the left edge. */
    const [box, setBox] = useState({ w: 320, h: 210 });
    useEffect(() => {
      const el = stageRef.current;
      if (!el || typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(([e]) =>
        setBox({ w: e.contentRect.width, h: e.contentRect.height }));
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    /* The reference NEVER changes size. When the target outgrows the stage the
       whole scene scales down together, which keeps the comparison honest and
       gives the player a fixed thing to judge against. */
    /* The zoom is applied to the SIZES, not as a transform on the row.
       Scaling the row meant its layout box stayed 2,730px wide at 17x while the
       painted result was clipped by overflow:hidden — both objects simply
       disappeared. Sizing them directly keeps the layout small, so there is
       nothing to clip and no transform-origin to get wrong. */
    const GAP = 30, PAD = 20, LABEL = 46;
    const rawTarget = STAGE * shown;
    const zoom = Math.min(1,
      (box.w - PAD * 2 - GAP) / Math.max(1, STAGE + rawTarget),
      (box.h - LABEL) / Math.max(1, Math.max(STAGE, rawTarget)));
    const refPx = Math.max(FLOOR, STAGE * zoom);
    const targetPx = Math.max(FLOOR, rawTarget * zoom);
    const zoomedOut = zoom < 0.97;

    const setFromRatio = next => {
      const { lo, hi } = rangeFor(item);
      const clamped = Math.min(hi, Math.max(lo, next));
      const snapped = snap(clamped, item);
      const final = snapped ?? clamped;
      if (snapped && lastDetent.current !== snapped) {
        lastDetent.current = snapped;
        if (!isMuted()) { try { navigator.vibrate?.(5); } catch { /* unsupported */ } }
      } else if (!snapped) lastDetent.current = null;
      setValue({ v: toSlider(final, item), touched: true });
    };

    /* Drag the object itself — up or right makes it bigger. The slider below
       stays bound to the same value for keyboard and for precision. */
    const onDown = e => {
      if (revealed) return;
      drag.current = { y: e.clientY, x: e.clientX, r };
      try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* synthetic */ }
    };
    const onMove = e => {
      const d = drag.current;
      if (!d || revealed) return;
      // Combined axes so either gesture works; 180px of travel ≈ one decade.
      const delta = ((d.y - e.clientY) + (e.clientX - d.x)) / 180;
      setFromRatio(d.r * Math.pow(10, delta));
    };
    const endDrag = () => { drag.current = null; lastDetent.current = null; };

    const onKey = e => {
      if (revealed) return;
      /* A FIXED step cannot mean a fixed amount: the slider is logarithmic and
         its span varies per question (1.05 to 1.45 decades), so `5` moved
         anywhere from 1.3% to 1.6% — ten presses took 0.37x to 0.38x. Derive
         the step from the span so an arrow is always the same RATIO change. */
      const step = stepsForRatio(e.shiftKey ? 1.25 : 1.05, item);
      const page = stepsForRatio(1.25, item);
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setValue({ v: Math.min(STEPS, value.v + step), touched: true }); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setValue({ v: Math.max(0, value.v - step), touched: true }); }
      if (e.key === 'PageUp')   { e.preventDefault(); setValue({ v: Math.min(STEPS, value.v + page), touched: true }); }
      if (e.key === 'PageDown') { e.preventDefault(); setValue({ v: Math.max(0, value.v - page), touched: true }); }
      if (e.key === 'Home') { e.preventDefault(); setValue({ v: 0, touched: true }); }
      if (e.key === 'End')  { e.preventDefault(); setValue({ v: STEPS, touched: true }); }
    };

    const text = livePhrase(item, revealed ? item.answer : r);

    return (
      <div className="m-size">
        <p className="readout">
          <b>{fmtX(r)}×</b>
          <span className="sub"> {DIM_WORD[item.dimension] || 'the size of'} {phrase(item.ref.label)}</span>
          {revealed && <> · <b className="t">actually {fmtX(item.answer)}×</b></>}
          {DIM_NOTE[item.dimension] && <span className="dimnote"> ({DIM_NOTE[item.dimension]})</span>}
        </p>
        {/* The phrase is the point. A number you cannot picture teaches nothing. */}
        {!abstract && <p className="sizephrase">{text}</p>}

        <div className="sizestage" ref={stageRef}>
          {zoomedOut && <span className="zoombadge">zoomed out ×{Math.round(1 / zoom)}</span>}
          <div className="sizescene">
            <div className="sizecell">
              {/* Fixed within the scene; it only changes when the CAMERA pulls
                  back, which the badge announces. */}
              <motion.div className="refbox"
                animate={{ width: refPx, height: refPx }}
                transition={{ type: 'spring', stiffness: 200, damping: 26 }}>
                {/* Grey silhouette, not the colour cartoon: the eye must compare
                    HEIGHT against the red object, not two clashing palettes. */}
                <Sil name={item.ref.key} size="100%" tone="ink" label={item.ref.label} fallbackToColour={false} />
              </motion.div>
              <span className="sizelab">{item.ref.label}<br /><b>{refLabel(item)}</b></span>
            </div>
            <div className={'sizecell target' + (revealed ? ' revealed' : '')}>
              <motion.div
                className={'sizegrab' + (revealed ? '' : ' live')}
                animate={{ width: Math.max(FLOOR, targetPx), height: Math.max(FLOOR, targetPx) }}
                transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                onPointerDown={onDown} onPointerMove={onMove}
                onPointerUp={endDrag} onPointerCancel={endDrag}
                role={revealed ? undefined : 'slider'}
                tabIndex={revealed ? -1 : 0}
                onKeyDown={onKey}
                aria-label={item.prompt}
                aria-valuemin={0} aria-valuemax={STEPS} aria-valuenow={value.v}
                aria-valuetext={text}>
                <Sil name={item.target.key} size="100%" tone="accent" label={item.target.label} fallbackToColour={false} />
                {/* No grab dot. It was anchored to the BOX, but the silhouette
                    is masked with `contain` and so rarely fills it — the dot
                    ended up floating in empty space beside the shape, reading
                    as a rendering artefact. The hint line under the stage
                    ("Drag the picture, or use the slider") carries the
                    affordance, and the whole shape stays draggable. */}
              </motion.div>
              <span className="sizelab">{item.target.label}<br />
                <b>{revealed ? `${fmtX(item.answer)}×` : '?'}</b></span>
            </div>
          </div>
        </div>

        {abstract && (
          <div className="sizebars" aria-hidden="true">
            <span className="sizebar" style={{ width: `${100 / Math.max(1, r)}%` }} />
            <span className="sizebar t" style={{ width: `${100 * Math.min(1, r)}%` }} />
          </div>
        )}

        {/* onKeyDown belongs HERE as well as on the picture. It was only on the
            draggable shape, so anyone who tabbed to the SLIDER — which is what
            a keyboard user reaches first — got the native behaviour instead:
            one step out of a thousand per arrow press, about 0.1% of a
            logarithmic span, and PageUp doing nothing at all. */}
        <input type="range" min="0" max={STEPS} value={value.v} disabled={revealed}
               onChange={e => setFromRatio(toRatio(+e.target.value, item))}
               onKeyDown={onKey}
               className="slider" aria-label={item.prompt + ' (slider)'}
               aria-valuetext={text} />
        {/* Rendered ALWAYS, emptied when there is nothing to say. Unmounting it
            the moment you touched the slider lifted Submit about 40px, out from
            under a finger already moving toward it. Reserve the row. */}
        <p className="hintline" aria-hidden={revealed || value.touched}>
          {!revealed && !value.touched ? 'Drag the picture, or use the slider.' : '\u00a0'}
        </p>
      </div>
    );
  },
};
