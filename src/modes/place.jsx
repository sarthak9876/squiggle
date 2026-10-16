import { useEffect, useRef, useCallback, useState } from 'react';
import { clamp } from './contract.js';

/* PLACE THE DOT — drop a thing between two axes.
   Rewards relational thinking rather than recall: you do not need the number, you
   need to know it sits above THIS and left of THAT. The grey references make the
   space readable; none may sit within 0.15 of the answer or they give it away. */
const P = { l: 62, r: 20, t: 16, b: 56 };   // left/bottom hold the tick numbers

/** Compact tick label: 1430 -> "1.4k", 0.03 -> "0.03", 1653 (a year) -> "1653".
 *  Years must never be abbreviated, the same rule the Put In Order values follow. */
const tick = (v, label = '') => {
  const f = axisFormat(label);
  if (f.kind === 'year') return String(Math.round(v));
  if (f.kind === 'log') return `10^${Math.round(v)}`;
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(a >= 1e10 ? 0 : 1) + 'B';
  if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M';
  if (a >= 1e4) return Math.round(v / 1e3) + 'k';
  if (a >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  if (a >= 10) return String(Math.round(v));
  if (a >= 1) return v.toFixed(1).replace(/\.0$/, '');
  return String(+v.toPrecision(2));
};

/* Every axis label already states its unit — "Height above sea level (m)",
   "Year first climbed", "Possible positions (log₁₀)". So the format comes from the
   data rather than a spec field copied onto 34 questions. This is what stopped
   years rendering as "1,913" and values rendering as a bare "44". */
export function axisFormat(label = '') {
  if (/\blog\s*₁₀|\blog10\b/i.test(label)) return { kind: 'log' };
  if (/^year\b|\byear\b/i.test(label) && !/years\)/i.test(label)) return { kind: 'year' };
  const m = label.match(/\(([^)]+)\)\s*$/);
  return { kind: 'num', unit: m ? m[1].trim() : '' };
}

/** Full-precision value for the reveal line (ticks use the compact `tick`). */
export function fmtAxis(v, label) {
  const f = axisFormat(label);
  if (f.kind === 'year') return String(Math.round(v));
  if (f.kind === 'log') return `10^${Math.round(v)}`;
  const n = Math.abs(v) >= 100 ? Math.round(v).toLocaleString()
          : (+v.toFixed(Math.abs(v) < 1 ? 2 : 1)).toString();
  // "26.5 millions" — scale words stay singular after a number, unlike "years".
  const unit = (f.unit || '').replace(/\b(million|billion|thousand|trillion)s\b/gi, '$1');
  return unit && unit !== '%' ? `${n} ${unit}` : unit === '%' ? `${n}%` : n;
}

const nx = (it, v) => (v - it.x.min) / (it.x.max - it.x.min);
const ny = (it, v) => 1 - (v - it.y.min) / (it.y.max - it.y.min);

export const place = {
  init: () => null,                      // {fx, fy} as 0..1 fractions, never pixels
  ready: v => !!v,
  clear: () => null,
  /* "You placed it at 6,188 / 1,913" told you nothing: no units, and the year had
     thousands separators. Name each axis and format it the way that axis reads. */
  detail: (item, v) => {
    if (!v) return '';
    const gx = item.x.min + v.fx * (item.x.max - item.x.min);
    const gy = item.y.min + (1 - v.fy) * (item.y.max - item.y.min);
    const axis = (label, mine, truth) =>
      `${label.replace(/\s*\([^)]*\)\s*$/, '')}: you ${fmtAxis(mine, label)}, answer ${fmtAxis(truth, label)}`;
    return `${axis(item.x.label, gx, item.answer[0])} · ${axis(item.y.label, gy, item.answer[1])}`;
  },
  score: (item, v) => {
    if (!v) return 0;
    // Distance in NORMALISED space so both axes weigh equally whatever their units.
    const d = Math.hypot(v.fx - nx(item, item.answer[0]), v.fy - ny(item, item.answer[1]));
    return clamp(Math.round(100 * (1 - d / 0.52)), 0, 100);
  },
  signedError: (item, v) => v ? (ny(item, item.answer[1]) - v.fy) : 0,
  extremity: (_i, v) => v ? Math.min(1, Math.hypot(v.fx - .5, v.fy - .5) * 2) : 0,
  // The y-axis is the more interesting of the two to show a crowd against.
  numeric: (item, v) => {
    const truth = item.answer[1];
    if (!v) return { truth, guess: truth };
    return { truth, guess: item.y.min + (1 - v.fy) * (item.y.max - item.y.min) };
  },
  Component: ({ item, value, setValue, revealed }) => {
    const ref = useRef(null);
    /* 0 -> 1 over 520ms once revealed, with a small overshoot. The canvas reads
       it to scale and drop the truth marker, so the answer lands rather than
       simply existing. */
    const [drop, setDrop] = useState(0);
    useEffect(() => {
      if (!revealed) { setDrop(0); return; }
      const still = typeof matchMedia === 'function'
        && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (still) { setDrop(1); return; }
      let raf, t0 = performance.now();
      const tick = t => {
        const p = Math.min(1, (t - t0) / 520);
        // easeOutBack: overshoots once, which reads as a bounce.
        const c1 = 1.70158, c3 = c1 + 1;
        setDrop(1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [revealed]);

    const draw = useCallback(() => {
      const cv = ref.current;
      if (!cv || !cv.parentElement) return;
      const w = cv.parentElement.clientWidth;
      const h = Math.round(clamp(w * 0.74, 240, 380));
      const dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.height = h + 'px';
      const c = cv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const css = getComputedStyle(document.documentElement);
      const V = n => css.getPropertyValue(n).trim();
      const px = f => P.l + f * (w - P.l - P.r);
      const py = f => P.t + f * (h - P.t - P.b);

      c.clearRect(0, 0, w, h);
      c.font = '12px ' + V('--font-ui');
      c.strokeStyle = V('--rule'); c.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = Math.round(py(i / 4)) + .5, x = Math.round(px(i / 4)) + .5;
        c.beginPath(); c.moveTo(P.l, y); c.lineTo(w - P.r, y); c.stroke();
        c.beginPath(); c.moveTo(x, P.t); c.lineTo(x, h - P.b); c.stroke();
      }
      c.strokeStyle = V('--rule-strong');
      c.beginPath(); c.moveTo(P.l + .5, P.t); c.lineTo(P.l + .5, h - P.b + .5); c.lineTo(w - P.r, h - P.b + .5); c.stroke();

      /* Numbered ticks at every gridline. Without them the grid was decoration:
         you could see that a dot was higher than another, but not by how much,
         which is the entire question this mode asks. */
      c.fillStyle = V('--ink-faint');
      c.font = '12px ' + V('--font-ui');
      c.textAlign = 'right'; c.textBaseline = 'middle';
      for (let i = 0; i <= 4; i++) {
        const v = item.y.max - (i / 4) * (item.y.max - item.y.min);
        c.fillText(tick(v, item.y.label), P.l - 7, py(i / 4));
      }
      c.textAlign = 'center'; c.textBaseline = 'top';
      for (let i = 0; i <= 4; i++) {
        const v = item.x.min + (i / 4) * (item.x.max - item.x.min);
        c.fillText(tick(v, item.x.label), px(i / 4), h - P.b + 7);
      }

      c.fillStyle = V('--ink-faint'); c.textAlign = 'center'; c.textBaseline = 'top';
      c.fillText(item.x.label, (P.l + w - P.r) / 2, h - P.b + 30);
      c.save(); c.translate(14, (P.t + h - P.b) / 2); c.rotate(-Math.PI / 2);
      c.textBaseline = 'middle';
      // Shrink rather than clip: the rotated label is bounded by the plot HEIGHT,
      // which is the short side, so long labels ran off the end.
      const avail = h - P.t - P.b - 10;
      let fs = 12;
      while (fs > 8.5 && c.measureText(item.y.label).width > avail) {
        fs -= 0.5; c.font = fs + 'px ' + V('--font-ui');
      }
      c.fillText(item.y.label, 0, 0); c.restore();
      c.font = '12px ' + V('--font-ui');

      // Reference labels with collision avoidance — two close dots used to print
      // their names straight through each other.
      c.font = '11.5px ' + V('--font-ui');
      const taken = [];
      const free = b => !taken.some(t => !(b.x2 < t.x || b.x > t.x2 || b.y2 < t.y || b.y > t.y2));
      c.textBaseline = 'middle';
      for (const r of item.refs) {
        const x = px(clamp(nx(item, r[1]), 0, 1)), y = py(clamp(ny(item, r[2]), 0, 1));
        c.fillStyle = V('--ink-faint');
        c.beginPath(); c.arc(x, y, 3.5, 0, Math.PI * 2); c.fill();
        const tw = c.measureText(r[0]).width;
        const spots = [[x + 8, y], [x - 8 - tw, y], [x - tw / 2, y - 13], [x - tw / 2, y + 13]];
        let placed = false;
        for (const s of spots) {
          const box = { x: s[0] - 2, y: s[1] - 7, x2: s[0] + tw + 2, y2: s[1] + 7 };
          if (box.x >= 2 && box.x2 <= w - 2 && box.y >= P.t - 6 && box.y2 <= h - P.b + 18 && free(box)) {
            c.textAlign = 'left'; c.fillText(r[0], s[0], s[1]); taken.push(box); placed = true; break;
          }
        }
        /* Everest and K2 sit almost on top of each other and one name used to be
           dropped entirely. Push further out and draw a leader line to the dot, so
           a crowded corner stays readable instead of losing a reference. */
        if (!placed) {
          for (let k = 2; k <= 5 && !placed; k++) {
            for (const dy of [-13 * k, 13 * k]) {
              const sx = x - tw / 2, sy = y + dy;
              const box = { x: sx - 2, y: sy - 7, x2: sx + tw + 2, y2: sy + 7 };
              if (box.x < 2 || box.x2 > w - 2 || box.y < P.t - 6 || box.y2 > h - P.b + 18 || !free(box)) continue;
              c.strokeStyle = V('--rule'); c.lineWidth = 1;
              c.beginPath(); c.moveTo(x, y + (dy < 0 ? -5 : 5)); c.lineTo(x, sy + (dy < 0 ? 8 : -8)); c.stroke();
              c.fillStyle = V('--ink-faint'); c.textAlign = 'left';
              c.fillText(r[0], sx, sy); taken.push(box); placed = true; break;
            }
          }
        }
      }

      if (revealed) {
        const tx = px(nx(item, item.answer[0])), ty = py(ny(item, item.answer[1]));
        if (value) {
          c.strokeStyle = V('--rule-strong'); c.setLineDash([4, 4]); c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(px(value.fx), py(value.fy)); c.lineTo(tx, ty); c.stroke(); c.setLineDash([]);
        }
        /* Drawn AFTER the dashed connector and given a paper-coloured ring, so a
           near-perfect guess does not hide the answer underneath itself. */
        const k = Math.max(0, drop);              // animation progress
        c.fillStyle = V('--truth');
        c.beginPath(); c.arc(tx, ty, 8 * k, 0, Math.PI * 2); c.fill();
        c.strokeStyle = V('--paper'); c.lineWidth = 2.5;
        c.beginPath(); c.arc(tx, ty, 8, 0, Math.PI * 2); c.stroke();
        c.strokeStyle = V('--truth'); c.lineWidth = 1.5;
        c.globalAlpha = Math.min(1, k);
        c.beginPath(); c.arc(tx, ty, 12.5 * k, 0, Math.PI * 2); c.stroke();
        c.globalAlpha = 1;
        c.textAlign = tx > w * 0.6 ? 'right' : 'left'; c.textBaseline = 'bottom';
        c.fillText(item.item, tx + (tx > w * 0.6 ? -10 : 10), ty - 6);
      }
      if (value) {
        const x = px(value.fx), y = py(value.fy);
        c.fillStyle = V('--accent');
        c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.fill();
        if (item.emoji) { c.font = '24px sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(item.emoji, x + 10, y - 16); }
      }
    }, [item, value, revealed, drop]);

    useEffect(() => { draw(); }, [draw]);
    useEffect(() => {
      const on = () => draw();
      window.addEventListener('resize', on);
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', on);
      return () => { window.removeEventListener('resize', on); mq.removeEventListener('change', on); };
    }, [draw]);

    /* Arrow keys move the dot, Enter/Space places it. 5% a press, 1% with Shift
       for fine work. Without this the mode was unplayable without a pointer. */
    const onKey = e => {
      if (revealed) return;
      const step = e.shiftKey ? 0.01 : 0.05;
      const cur = value || { fx: 0.5, fy: 0.5 };
      const move = (dx, dy) => {
        e.preventDefault();
        setValue({ fx: clamp(cur.fx + dx, 0, 1), fy: clamp(cur.fy + dy, 0, 1) });
      };
      switch (e.key) {
        case 'ArrowLeft':  return move(-step, 0);
        case 'ArrowRight': return move(step, 0);
        case 'ArrowUp':    return move(0, -step);
        case 'ArrowDown':  return move(0, step);
        case 'Enter': case ' ':
          if (!value) { e.preventDefault(); setValue({ fx: 0.5, fy: 0.5 }); }
          return;
        default: return;
      }
    };

    return (
      <canvas ref={ref} className="canv place" tabIndex={revealed ? -1 : 0} onKeyDown={onKey}
        role={revealed ? 'img' : 'application'}
        aria-label={item.prompt}
        onPointerDown={e => {
          if (revealed) return;
          const r = e.currentTarget.getBoundingClientRect();
          setValue({
            fx: clamp((e.clientX - r.left - P.l) / (r.width - P.l - P.r), 0, 1),
            fy: clamp((e.clientY - r.top - P.t) / (r.height - P.t - P.b), 0, 1),
          });
        }} />
    );
  },
};
