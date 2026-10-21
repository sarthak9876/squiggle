import { puzzleLabel, SLOTS, LAUNCH_DAY } from './schedule.js';
import { BRAND } from '../brand.js';
import { loadEmojiImage } from './emojiUrl.js';
/* The card's palette is pinned, deliberately. See the note in drawShareCard.
   Keep these in step with the light-theme values in styles/tokens.css. */
export const CARD_PALETTE = {
  '--paper-2': '#fffdf8',
  '--ink':     '#1a1a1f',
  '--ink-soft':'#5c5c68',
  '--accent':  '#ff5a5f',
  '--good':    '#12a150',
  '--warn':    '#e08700',
  '--mid':     '#e8833a',
};

/* Bias Fingerprint share card, drawn on a canvas.

   A rendered image beats an emoji grid here because the Fingerprint is a *claim
   about the person*, and a claim needs room to breathe.

   Two formats, because the two places this gets posted crop differently:
     post  1080x1350 (4:5) — feeds crop this least.
     story 1080x1920 (9:16) — full-bleed on Instagram and WhatsApp status, where
           a 4:5 card would sit in a letterboxed grey band and look like a mistake.
   The story version is not a stretched post: the extra 570px goes into the layout
   as breathing room and a call to action, so it reads as made for the format. */
/* The canvas must wait for the webfont. Canvas does not trigger a font load and
   does not re-paint when one arrives, so drawing before it is ready silently
   bakes the fallback into the PNG that gets shared. */
export async function ensureCardFont() {
  try {
    if (!document.fonts) return;
    await Promise.all([
      document.fonts.load('700 96px "Space Grotesk"'),
      document.fonts.load('400 38px "Space Grotesk"'),
    ]);
    await document.fonts.ready;
  } catch { /* fall back to system-ui, which still renders */ }
}

/* Preloaded by ensureCardFont's caller before drawing, because canvas cannot
   wait mid-draw. Null means "use the glyph", which still renders. */
let fpEmojiImg = null;
export async function ensureCardEmoji(ch) { fpEmojiImg = await loadEmojiImage(ch); }

export function drawShareCard(fp, { total, max, day, scores, format = 'post' }) {
  const story = format === 'story';
  const W = 1080, H = story ? 1920 : 1350;
  // Everything below 380 is laid out from `top`, so one offset moves the whole
  // composition down for the taller canvas instead of thirty tweaked constants.
  const top = story ? 230 : 0;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  /* FIXED palette, not the live theme.
     The card used to read its colours from the current theme, so a result shared
     from dark mode reached your friend looking like a different product from one
     shared in light mode — and the tile colours drifted from the in-app ones the
     moment anyone toggled. A shared image is branding: it looks the same for
     everyone, always. These are the light-theme token values, pinned. */
  const V = n => CARD_PALETTE[n] || '#000';

  const paper = V('--paper-2'), ink = V('--ink'), soft = V('--ink-soft'), accent = V('--accent');

  c.fillStyle = paper; c.fillRect(0, 0, W, H);

  // Paper grain, same idea as the page background so the card feels like the site.
  c.globalAlpha = 0.035; c.fillStyle = ink;
  for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 1);
  c.globalAlpha = 1;

  /* The logo, drawn to match SquiggleMark: a curve that is your guess and a dot
     where the answer was. Same two shapes as the favicon and the header. */
  c.strokeStyle = accent; c.lineWidth = 14; c.lineCap = 'round';
  c.beginPath();
  c.moveTo(110, 220);
  c.bezierCurveTo(250, 220, 268, 96, 408, 96);
  c.bezierCurveTo(548, 96, 566, 268, 706, 268);
  c.bezierCurveTo(846, 268, 826, 112, 946, 112);
  c.stroke();
  c.fillStyle = ink;
  c.beginPath(); c.arc(880, 150, 26, 0, Math.PI * 2); c.fill();

  c.textAlign = 'center';
  c.fillStyle = soft; c.font = '600 34px "Space Grotesk", system-ui, sans-serif';
  c.fillText('YOUR BIAS FINGERPRINT', W / 2, 380 + top);

  if (fpEmojiImg) c.drawImage(fpEmojiImg, W / 2 - 65, 530 + top - 112, 130, 130);
  else { c.font = '130px "Space Grotesk", system-ui, sans-serif'; c.fillText(fp.emoji, W / 2, 530 + top); }

  c.fillStyle = ink; c.font = '700 78px "Space Grotesk", system-ui, sans-serif';
  wrap(c, fp.title, W / 2, 650 + top, W - 180, 86);

  c.fillStyle = soft; c.font = '400 38px "Space Grotesk", system-ui, sans-serif';
  wrap(c, fp.blurb, W / 2, 770 + top, W - 200, 52);

  /* Per-question squares — spoiler-free, same idea as a Wordle grid.
     EACH ROW is centred on its own width. The old code centred on a fixed
     eight-column grid whatever the run length, so a five-question practice card
     drew five squares starting at the eight-column origin and sat visibly left of
     the score beneath it. A 16-question card hid the bug because it filled the
     grid exactly. */
  const cols = Math.min(8, scores.length), sq = 74, gap = 14;
  const rowWidth = n => n * sq + (n - 1) * gap;
  const y0 = 920 + top;
  scores.forEach((s, i) => {
    const row = Math.floor(i / cols);
    // How many squares are actually on THIS row — the last row is often short.
    const inRow = Math.min(cols, scores.length - row * cols);
    const cx = (W - rowWidth(inRow)) / 2 + (i % cols) * (sq + gap);
    const cy = y0 + row * (sq + gap);
    // Same four bands as .sq.a/.b/.c/.d in game.css — one palette, two renderers.
    c.fillStyle = s >= 85 ? V('--good') : s >= 60 ? V('--warn') : s >= 35 ? V('--mid') : accent;
    c.globalAlpha = s >= 35 ? 1 : .75;
    roundRect(c, cx, cy, sq, sq, 16); c.fill();
    c.globalAlpha = 1;
  });

  c.fillStyle = ink; c.font = '700 96px "Space Grotesk", system-ui, sans-serif';
  c.fillText(`${total}/${max}`, W / 2, 1180 + top);

  c.fillStyle = soft; c.font = '500 34px "Space Grotesk", system-ui, sans-serif';
  c.fillText(`${BRAND.name} ${puzzleLabel(day)} · ${BRAND.domain}`, W / 2, 1250 + top);

  if (story) {
    // Stories are watched, not read. One line, large, at thumb height.
    c.fillStyle = accent; c.font = '700 46px "Space Grotesk", system-ui, sans-serif';
    c.fillText('Can you beat this?', W / 2, 1640);
    c.fillStyle = soft; c.font = '500 36px "Space Grotesk", system-ui, sans-serif';
    c.fillText(`${BRAND.domain} — new set every day`, W / 2, 1700);
  }

  return cv;
}

/** The challenge link a player sends a friend: it carries the score to beat and
 *  who set it, so the friend lands on a page that already knows what it is for. */
/** Read a challenge link back. The counterpart to challengeLink, and kept
 *  beside it because the bug was that the two disagreed: the writer put the day
 *  in and the reader never took it out, so a link made for day 290 was shown
 *  against today's set under the line "scored N on today's set".
 *
 *  Returns null for anything that cannot be a fair comparison — a score nobody
 *  could have scored, or a day that has not happened. A link with no `d` is
 *  from before the day was carried; today is the only guess available and it is
 *  what the game already assumed. */
export function parseChallenge(search, today, launchDay = LAUNCH_DAY) {
  const q = new URLSearchParams(search || '');
  const vs = Number(q.get('vs'));
  if (!q.has('vs') || !Number.isFinite(vs) || vs < 0 || vs > SLOTS.length * 100) return null;

  const raw = q.get('d');
  const day = raw == null || raw === '' ? today : Number(raw);
  if (!Number.isInteger(day) || day < launchDay || day > today) return null;

  return { vs, day, forToday: day === today, from: (q.get('from') || '').slice(0, 24) };
}

export function challengeLink(name, total, day, origin = location.origin) {
  const u = new URL('/play', origin);
  u.searchParams.set('vs', String(total));
  u.searchParams.set('d', String(day));
  if (name) u.searchParams.set('from', name.slice(0, 24));
  return u.toString();
}

export function shareText(fp, { total, max, day, scores }) {
  const emo = s => s >= 85 ? '🟩' : s >= 60 ? '🟨' : s >= 35 ? '🟧' : '🟥';
  const rows = [];
  for (let i = 0; i < scores.length; i += 8) rows.push(scores.slice(i, i + 8).map(emo).join(''));
  // End with a real URL: a bare domain is not a link in most chat apps,
  // and a shared result with nothing to tap is a dead end.
  return `${BRAND.name} ${puzzleLabel(day)} — ${total}/${max}\n${fp.emoji} ${fp.title}\n${rows.join('\n')}\n${BRAND.url}`;
}

function wrap(c, text, cx, y, maxW, lh) {
  const words = String(text).split(' ');
  let line = '', lines = [];
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (c.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => c.fillText(l, cx, y + i * lh));
  return lines.length;
}
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
