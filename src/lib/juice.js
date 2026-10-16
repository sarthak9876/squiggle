/* Reward feedback: confetti, a short tone, and a buzz.
   All three are hand-rolled rather than imported — a confetti library is ~15 kB
   gzipped to draw forty rectangles, and an audio file is a network request for
   something two oscillators do better.

   Three rules this file exists to keep:
   1. prefers-reduced-motion kills the confetti and the shake, never the score.
   2. Audio is opt-out and lazily constructed, because an AudioContext made before
      a user gesture is born suspended and never recovers on iOS.
   3. Nothing here may throw into the render path. A missing API on an old browser
      must degrade to silence, not to a blank screen. */

const reduced = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const MUTE_KEY = 'sq.mute';
export const isMuted = () => {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
};
export const setMuted = m => {
  try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* private mode */ }
};

let ctx = null;
const audio = () => {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC(); } catch { ctx = null; }
  return ctx;
};

/** One note. `type` picks the timbre; `t0` offsets it so notes can be chained. */
function note(freq, { at = 0, dur = 0.12, type = 'sine', gain = 0.08 } = {}) {
  const a = audio();
  if (!a) return;
  // A context created before the first gesture starts suspended on iOS and Chrome.
  if (a.state === 'suspended') a.resume?.();
  const t = a.currentTime + at;
  const osc = a.createOscillator(), g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  // Exponential fade — a linear one clicks audibly at the end.
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t); osc.stop(t + dur);
}

export function ding() {
  if (isMuted()) return;
  try { note(880, { at: 0, dur: 0.1 }); note(1320, { at: 0.08, dur: 0.16 }); } catch { /* no audio */ }
}

export function bonk() {
  if (isMuted()) return;
  try { note(150, { at: 0, dur: 0.16, type: 'square', gain: 0.05 }); } catch { /* no audio */ }
}

export function buzz(pattern) {
  try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
}

/** Confetti burst from the top of `el`. Returns a cancel function so a component
 *  that unmounts mid-burst does not leave a canvas and an rAF loop behind — the
 *  exact leak that outlived a reveal animation once already. */
export function confetti(el, { count = 48 } = {}) {
  if (!el || reduced()) return () => {};
  const rect = el.getBoundingClientRect();
  const cv = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = rect.width * dpr; cv.height = 260 * dpr;
  Object.assign(cv.style, {
    position: 'fixed', left: rect.left + 'px', top: rect.top + 'px',
    width: rect.width + 'px', height: '260px', pointerEvents: 'none', zIndex: 60,
  });
  document.body.appendChild(cv);
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);

  const colours = ['#ff6b4a', '#ffd166', '#06d6a0', '#4cc9f0', '#b388ff'];
  const bits = Array.from({ length: count }, () => ({
    x: rect.width / 2 + (Math.random() - 0.5) * rect.width * 0.5,
    y: 20 + Math.random() * 10,
    vx: (Math.random() - 0.5) * 5,
    vy: -2 - Math.random() * 4,
    r: 3 + Math.random() * 4,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    c: colours[(Math.random() * colours.length) | 0],
  }));

  let raf, alive = true;
  const tick = () => {
    // isConnected, not a flag: React can rip the node out without telling us.
    if (!alive || !cv.isConnected) return;
    g.clearRect(0, 0, rect.width, 260);
    let onscreen = 0;
    for (const b of bits) {
      b.vy += 0.16;                       // gravity
      b.x += b.vx; b.y += b.vy; b.rot += b.vr;
      if (b.y < 270) onscreen++;
      g.save();
      g.translate(b.x, b.y); g.rotate(b.rot);
      g.fillStyle = b.c;
      g.fillRect(-b.r / 2, -b.r / 2, b.r, b.r * 0.6);
      g.restore();
    }
    if (onscreen === 0) return stop();
    raf = requestAnimationFrame(tick);
  };
  const stop = () => { alive = false; cancelAnimationFrame(raf); cv.remove(); };
  raf = requestAnimationFrame(tick);
  setTimeout(stop, 2600);                 // hard ceiling, whatever the physics do
  return stop;
}

/** The full reaction for a score. One call site, so the thresholds live together. */
export function react(score, el) {
  if (score >= 90) { ding(); buzz([12, 40, 18]); return confetti(el); }
  if (score < 30)  { bonk(); buzz(30); }
  return () => {};
}
