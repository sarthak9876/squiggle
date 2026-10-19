import { useEffect, useRef, useCallback, useState } from 'react';
import { clamp } from './contract.js';
import { rng, hash } from '../lib/random.js';

/* DRAW THE CURVE — freehand real data on blank axes.
   The flagship. Stored as SAMPLES fractions 0..1, never pixels, so a resize or a
   phone rotation cannot destroy an in-progress drawing and the scorer needs no
   knowledge of screen size. */
const SAMPLES = 240, ZERO_AT = 0.33;
const P = { l: 60, r: 14, t: 16, b: 36 };

export const normY = (p, v) => p.log
  ? 1 - (Math.log10(Math.max(v, p.yMin)) - Math.log10(p.yMin)) / (Math.log10(p.yMax) - Math.log10(p.yMin))
  : 1 - (v - p.yMin) / (p.yMax - p.yMin);

export function truthAt(p, xv) {
  const pts = p.points;
  if (xv <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (xv <= pts[i][0]) {
      const a = pts[i - 1], b = pts[i], t = (xv - a[0]) / (b[0] - a[0]);
      // Interpolate in log space on log charts, or a six-decade series bulges wildly.
      return p.log
        ? Math.pow(10, Math.log10(a[1]) + t * (Math.log10(b[1]) - Math.log10(a[1])))
        : a[1] + t * (b[1] - a[1]);
    }
  }
  return pts[pts.length - 1][1];
}

function fillGaps(line) {
  const a = line.slice();
  const first = a.findIndex(v => v != null);
  if (first < 0) return null;
  let last = a.length - 1; while (last >= 0 && a[last] == null) last--;
  for (let i = 0; i < first; i++) a[i] = a[first];
  for (let i = last + 1; i < a.length; i++) a[i] = a[last];
  for (let i = first; i <= last; i++) {
    if (a[i] == null) {
      let j = i; while (j < a.length && a[j] == null) j++;
      const lo = a[i - 1], hi = a[j] != null ? a[j] : lo;
      for (let k = i; k < j; k++) a[k] = lo + (hi - lo) * ((k - i + 1) / (j - i + 1));
    }
  }
  return a;
}

export const draw = {
  init: () => new Array(SAMPLES).fill(null),
  ready: v => v.filter(x => x != null).length / SAMPLES >= 0.85,
  score: (item, v) => {
    const a = fillGaps(v);
    if (!a) return 0;
    // Error in NORMALISED CHART SPACE — one rule serves a 0-100% axis and a
    // six-decade log axis alike, and it matches what the player actually perceives.
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const xv = item.xMin + (item.xMax - item.xMin) * (i / (a.length - 1));
      sum += Math.abs(a[i] - normY(item, truthAt(item, xv)));
    }
    return clamp(Math.round(100 * (1 - (sum / a.length) / ZERO_AT)), 0, 100);
  },
  signedError: (item, v) => {
    const a = fillGaps(v); if (!a) return 0;
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const xv = item.xMin + (item.xMax - item.xMin) * (i / (a.length - 1));
      sum += normY(item, truthAt(item, xv)) - a[i];   // +ve = drew above = guessed high
    }
    return sum / a.length;
  },
  extremity: (_i, v) => {
    const a = fillGaps(v); if (!a) return 0.5;
    return Math.min(1, (Math.max(...a) - Math.min(...a)) * 1.4);
  },
  // Compared at the midpoint of the series: one number that stands in for
  // "where did you put the line", which is what a distribution can show.
  numeric: (item, v) => {
    const a = fillGaps(v);
    const mid = Math.floor(SAMPLES / 2);
    const xv = item.xMin + (item.xMax - item.xMin) * 0.5;
    const truth = truthAt(item, xv);
    if (!a) return { truth, guess: truth };
    // Invert the normalised y back into data units so the axis labels mean something.
    const n = a[mid];
    const guess = item.log
      ? Math.pow(10, Math.log10(item.yMin) + (1 - n) * (Math.log10(item.yMax) - Math.log10(item.yMin)))
      : item.yMin + (1 - n) * (item.yMax - item.yMin);
    return { truth, guess };
  },
  clear: () => new Array(SAMPLES).fill(null),
  /** Explains the number: the average vertical gap between your line and the real
   *  one, as a share of the chart's height. */
  detail: (item, v) => {
    const a = fillGaps(v);
    if (!a) return '';
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const xv = item.xMin + (item.xMax - item.xMin) * (i / (a.length - 1));
      sum += Math.abs(a[i] - normY(item, truthAt(item, xv)));
    }
    const pct = Math.round((sum / a.length) * 100);
    return `Your line sat about ${pct}% of the chart's height away from the real one, on average.`;
  },
  SAMPLES,
  Component: ({ item, value, setValue, revealed, crowd }) => {
    const ref = useRef(null);
    const last = useRef(null);
    /* A REF, not state. `drawing` is read by the very next pointermove, and a
       pointermove that arrives in the same frame as the pointerdown would read the
       pre-render value and be dropped — which is exactly what a fast flick, a
       coalesced 120Hz event stream, and a synthetic test all produce. */
    const drawing = useRef(false);
    const [kbFocus, setKbFocus] = useState(false);
    /* Start the keyboard cursor ON the revealed anchor point, not at mid-height.
       Arrow keys used to begin the line in mid-air (1.5k when the blue start dot
       said 2.8k), so a keyboard player's first stroke was wrong before they moved. */
    const startY = (() => {
      const p0 = item.points?.[0];
      if (!p0) return 0.5;
      const v = p0[1];
      const f = item.log
        ? (Math.log10(v) - Math.log10(item.yMin)) / (Math.log10(item.yMax) - Math.log10(item.yMin))
        : (v - item.yMin) / (item.yMax - item.yMin);
      return clamp(1 - f, 0, 1);
    })();
    const kb = useRef({ i: 0, y: startY, last: null });   // keyboard cursor
    const [reveal, setReveal] = useState(0);

    useEffect(() => {
      if (!revealed) { setReveal(0); return; }
      let raf, t0 = performance.now();
      const tick = t => {
        const p = Math.min(1, (t - t0) / 700);
        setReveal(p);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [revealed]);

    const render = useCallback(() => {
      const cv = ref.current;
      if (!cv || !cv.parentElement) return;
      const w = cv.parentElement.clientWidth;
      const h = Math.round(clamp(w * 0.68, 240, 380));
      const dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.height = h + 'px';
      const c = cv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const css = getComputedStyle(document.documentElement);
      const V = n => css.getPropertyValue(n).trim();
      const pw = w - P.l - P.r, ph = h - P.t - P.b;
      const fx = f => P.l + f * pw, fy = f => P.t + f * ph;

      c.clearRect(0, 0, w, h);
      c.font = '11px ' + V('--font-ui');
      c.textAlign = 'right'; c.textBaseline = 'middle';
      for (const tv of yTicks(item)) {
        const y = Math.round(fy(normY(item, tv))) + .5;
        c.strokeStyle = V('--rule'); c.lineWidth = 1;
        c.beginPath(); c.moveTo(P.l, y); c.lineTo(w - P.r, y); c.stroke();
        c.fillStyle = V('--ink-faint'); c.fillText(fmt(tv), P.l - 8, y);
      }
      c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = V('--ink-faint');
      for (const f of [0, .5, 1]) c.fillText(String(Math.round(item.xMin + (item.xMax - item.xMin) * f)), fx(f), h - P.b + 8);
      c.strokeStyle = V('--rule-strong');
      c.beginPath(); c.moveTo(P.l + .5, P.t); c.lineTo(P.l + .5, h - P.b + .5); c.lineTo(w - P.r, h - P.b + .5); c.stroke();

      // CROWD CURVES — faint lines showing where other players drew. Seeing that
      // everyone else was wrong the same way is the most consoling thing in the game.
      if (revealed && crowd) {
        const r = rng(hash(item.title || item.question));
        c.lineWidth = 1.6;
        for (let k = 0; k < 7; k++) {
          const lean = (r() - 0.45) * 0.3, wob = 0.05 + r() * 0.08;
          c.strokeStyle = V('--ink-faint');
          c.globalAlpha = 0.16;
          c.beginPath();
          for (let i = 0; i <= 60; i++) {
            const f = i / 60;
            const xv = item.xMin + (item.xMax - item.xMin) * f;
            const base = normY(item, truthAt(item, xv));
            const y = clamp(base + lean + Math.sin(f * 6 + k) * wob, 0, 1);
            i ? c.lineTo(fx(f), fy(y)) : c.moveTo(fx(f), fy(y));
          }
          c.stroke();
        }
        c.globalAlpha = 1;
      }

      if (revealed) {
        c.strokeStyle = V('--truth'); c.lineWidth = 3.4; c.lineJoin = c.lineCap = 'round';
        c.beginPath();
        const upto = Math.floor(reveal * (SAMPLES - 1));
        for (let i = 0; i <= upto; i++) {
          const xv = item.xMin + (item.xMax - item.xMin) * (i / (SAMPLES - 1));
          const x = fx(i / (SAMPLES - 1)), y = fy(normY(item, truthAt(item, xv)));
          i ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
      }

      c.strokeStyle = V('--accent'); c.lineWidth = 2.8; c.lineJoin = c.lineCap = 'round';
      c.beginPath();
      let on = false;
      for (let i = 0; i < SAMPLES; i++) {
        if (value[i] == null) { on = false; continue; }
        const x = fx(i / (SAMPLES - 1)), y = fy(value[i]);
        on ? c.lineTo(x, y) : c.moveTo(x, y); on = true;
      }
      c.stroke();

      // The anchor is always given away: without it players guess the LEVEL rather
      // than the SHAPE, and the shape is the actual game.
      const a0 = item.points[0];
      const ax = fx((a0[0] - item.xMin) / (item.xMax - item.xMin)), ay = fy(normY(item, a0[1]));
      c.fillStyle = V('--truth');
      c.beginPath(); c.arc(ax, ay, 4.5, 0, Math.PI * 2); c.fill();
      if (!revealed) {
        c.fillStyle = V('--ink-faint'); c.textAlign = 'left'; c.textBaseline = 'middle';
        c.fillText('start: ' + fmt(a0[1]), ax + 9, ay);
      }
    }, [item, value, revealed, reveal, crowd]);

    useEffect(() => { render(); }, [render]);
    useEffect(() => {
      const on = () => render();
      window.addEventListener('resize', on);
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', on);
      return () => { window.removeEventListener('resize', on); mq.removeEventListener('change', on); };
    }, [render]);

    const plot = e => {
      const cv = ref.current, r = cv.getBoundingClientRect();
      const pw = r.width - P.l - P.r, ph = r.height - P.t - P.b;
      const f = clamp((e.clientX - r.left - P.l) / pw, 0, 1);
      const y = clamp((e.clientY - r.top - P.t) / ph, 0, 1);
      const idx = Math.round(f * (SAMPLES - 1));
      const from0 = last.current;
      // Functional update: two pointermoves in one frame both read `value` from
      // the same render, so the second silently discarded the first. Same bug the
      // tap modes had, same fix.
      setValue(prev => {
        const next = prev.slice();
        if (from0 != null && from0 !== idx) {
          // A fast drag jumps several samples a frame; fill the gap or the line
          // comes out as disconnected dashes.
          const step = idx > from0 ? 1 : -1;
          const from = next[from0] != null ? next[from0] : y;
          const n = Math.abs(idx - from0);
          for (let k = 1; k <= n; k++) next[from0 + k * step] = from + (y - from) * (k / n);
        } else next[idx] = y;
        return next;
      });
      last.current = idx;
    };

    /* A fast flick delivers ONE pointermove per frame with the intermediate
       positions bundled inside it. Without unpacking them the stroke is sampled at
       60Hz regardless of how fast the finger moved, and a quick swipe across the
       chart lands as a handful of points joined by straight interpolation. */
    const plotAll = e => {
      const pts = e.nativeEvent?.getCoalescedEvents?.() || [];
      if (pts.length > 1) for (const p of pts) plot(p);
      else plot(e);
    };

    /* Lifting the pen and starting again further right should CONTINUE the line,
       not leave a hole that silently keeps Submit disabled. Seed `last` with the
       rightmost sample already drawn so the gap gets bridged. */
    const resumeFrom = idx => {
      let right = -1;
      for (let i = 0; i < SAMPLES; i++) if (value[i] != null) right = i;
      last.current = right >= 0 && idx > right ? right : null;
    };

    const drawn = value.filter(x => x != null).length;
    const covered = drawn / SAMPLES;
    let lastX = -1;
    for (let i = 0; i < SAMPLES; i++) if (value[i] != null) lastX = i;
    const reachedEnd = lastX >= SAMPLES - 3;

    /* Keyboard drawing: left/right walk the year columns, up/down set the value
       at the cursor and fill forward from the last point, so a full curve is
       reachable without a pointer. */
    const onKey = e => {
      if (revealed) return;
      const cur = kb.current;
      const setAt = (i, y) => setValue(prev => {
        const next = prev.slice();
        const from = cur.last;
        if (from != null && from !== i) {
          const step = i > from ? 1 : -1;
          const y0 = next[from] != null ? next[from] : y;
          const n = Math.abs(i - from);
          for (let k = 1; k <= n; k++) next[from + k * step] = y0 + (y - y0) * (k / n);
        } else next[i] = y;
        return next;
      });
      const jump = e.shiftKey ? 24 : 6;
      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); cur.last = cur.i; cur.i = Math.min(SAMPLES - 1, cur.i + jump); setAt(cur.i, cur.y); return;
        case 'ArrowLeft':  e.preventDefault(); cur.last = cur.i; cur.i = Math.max(0, cur.i - jump); setAt(cur.i, cur.y); return;
        case 'ArrowUp':    e.preventDefault(); cur.y = clamp(cur.y - (e.shiftKey ? 0.01 : 0.05), 0, 1); cur.last = null; setAt(cur.i, cur.y); return;
        case 'ArrowDown':  e.preventDefault(); cur.y = clamp(cur.y + (e.shiftKey ? 0.01 : 0.05), 0, 1); cur.last = null; setAt(cur.i, cur.y); return;
        case 'Home':       e.preventDefault(); cur.last = null; cur.i = 0; setAt(0, cur.y); return;
        case 'End':        e.preventDefault(); cur.last = cur.i; cur.i = SAMPLES - 1; setAt(SAMPLES - 1, cur.y); return;
        default: return;
      }
    };

    return (
      <>
        <canvas ref={ref} className="canv draw" tabIndex={revealed ? -1 : 0} onKeyDown={onKey}
          onFocus={() => setKbFocus(true)} onBlur={() => setKbFocus(false)}
          role={revealed ? 'img' : 'application'} aria-label={item.question + '. Arrow keys draw.'}
          onPointerDown={e => {
            if (revealed) return;
            drawing.current = true;
            const r = e.currentTarget.getBoundingClientRect();
            const pw = r.width - P.l - P.r;
            resumeFrom(Math.round(clamp((e.clientX - r.left - P.l) / pw, 0, 1) * (SAMPLES - 1)));
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
            plot(e);
          }}
          onPointerMove={e => { if (drawing.current && !revealed) plotAll(e); }}
          onPointerUp={() => { drawing.current = false; last.current = null; }}
          onPointerCancel={() => { drawing.current = false; last.current = null; }} />
        {/* Submit used to just sit there greyed out with no explanation. Say what
            is missing and where to go. */}
        {/* Keyboard players had no idea the canvas was drivable.
            Kept MOUNTED and hidden rather than unmounted, because this line sits
            directly above the Submit button: drawing focuses the canvas, pressing
            Submit blurs it, and unmounting here moved the button up 28px between
            mousedown and mouseup. The browser then retargets the click to the
            card, so onClick never ran and Submit looked dead on the flagship
            mode. Reserve the space and nothing moves mid-click. */}
        {!revealed && (
          <p className={'hintline kbhint' + (kbFocus ? ' on' : '')} aria-hidden={!kbFocus}>
            ← → move along the years · ↑ ↓ set the value · Shift for fine steps
          </p>
        )}
        {!revealed && (
          drawn === 0
            ? <p className="hintline">Draw a line across the chart — left to right.</p>
            : covered < 0.85
              ? <p className="hintline pulse">Keep going to {item.xMax} →{' '}
                  <span className="sub">{Math.round(covered * 100)}% drawn</span></p>
              /* Once Submit is live the nudge must stop pulsing and stop reading
                 like a blocker — a flashing "keep going" beside an enabled button
                 is what made the dead click look deliberate. */
              : !reachedEnd
                ? <p className="hintline">You can submit now, or draw on to {item.xMax}.</p>
                : null
        )}
      </>
    );
  },
};

/* Round numbers, not evenly-divided ones.
   Splitting a range into four gave ticks like 1.3, 2.5, 3.8 — arithmetically
   fine and unreadable. Step up through 1/2/2.5/5 x 10^n and take whatever lands
   inside the range, which is how a chart axis is meant to read. */
function niceTicks(min, max, count = 5) {
  const span = max - min;
  if (!(span > 0)) return [min];
  const raw = span / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || 10 * mag;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) {
    out.push(+v.toFixed(10));
  }
  return out.length >= 2 ? out : [min, max];
}

function yTicks(p) {
  if (p.log) {
    const out = [];
    for (let e = Math.ceil(Math.log10(p.yMin)); e <= Math.floor(Math.log10(p.yMax)); e++) out.push(Math.pow(10, e));
    const step = Math.ceil(out.length / 6) || 1;
    return out.filter((_, i) => i % step === 0);
  }
  return niceTicks(p.yMin, p.yMax);
}
function fmt(v) {
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e4 ? 0 : 1) + 'k';
  if (a >= 10) return v.toFixed(0);
  if (a >= 1) return v.toFixed(a % 1 ? 1 : 0);
  if (a === 0) return '0';
  if (a >= 0.01) return v.toFixed(2);
  return v.toPrecision(2);
}
