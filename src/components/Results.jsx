import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { fingerprint } from '../lib/bias.js';
import { drawShareCard, shareText, challengeLink, ensureCardFont, ensureCardEmoji } from '../lib/sharecard.js';
import { GAMES } from '../games.jsx';
import { dayNumber, puzzleLabel } from '../lib/schedule.js';
import { BRAND } from '../brand.js';
import Countdown from './Countdown.jsx';
import Mascot, { moodFor } from './Mascot.jsx';
import AdSlot from './AdSlot.jsx';

/* navigator.share can EXIST and still never settle. Measured on desktop Chrome
   with no OS share sheet: share({text}) was still pending after three seconds —
   never resolved, never rejected — so the catch blocks below could not fire and
   the clipboard fallback was unreachable. The player pressed Share and nothing
   happened at all: no sheet, no toast, nothing in the console.

   A real share sheet takes focus off the page. If we still hold focus a beat
   later then no sheet opened and that promise is never going to settle, so throw
   and let the caller fall through to its clipboard path. When a sheet DID open
   we keep waiting, for as long as the player takes to choose an app. */
function shareOrFallThrough(payload) {
  return Promise.race([
    navigator.share(payload),
    new Promise((_, reject) => setTimeout(() => {
      if (document.hasFocus()) reject(new Error('no share sheet opened'));
    }, 1200)),
  ]);
}

export default function Results({ answers, lineup, label, onHome, onAgain, onArchive, isDaily, kind = 'daily', day: dayProp }) {
  const total = answers.reduce((a, b) => a + b.score, 0);
  const max = answers.length * 100;
  const fp = fingerprint(answers);
  const day = dayProp != null ? dayProp : dayNumber();
  const scores = answers.map(a => a.score);
  const cardRef = useRef(null);
  const [toast, setToast] = useState('');
  const [name, setName] = useState(() => { try { return localStorage.getItem('sq.name') || ''; } catch { return ''; } });
  const say = m => { setToast(m); setTimeout(() => setToast(''), 1800); };

  useEffect(() => {
    if (!cardRef.current) return;
    let alive = true;
    // Await the font, then draw — otherwise the shared PNG carries system-ui.
    Promise.all([ensureCardFont(), ensureCardEmoji(fp.emoji)]).then(() => {
      if (!alive || !cardRef.current) return;
      const cv = drawShareCard(fp, { total, max, day, scores });
      cardRef.current.innerHTML = '';
      cv.style.width = '100%'; cv.style.height = 'auto'; cv.style.borderRadius = '14px';
      cardRef.current.appendChild(cv);
    });
    return () => { alive = false; };
  }, []);

  /* Saving is a separate action from sharing. Web Share is the better path on a
     phone, but it does not exist on desktop and it cannot put a file in Downloads
     — which is exactly what someone editing a story later wants. */
  /* On a phone with Web Share, hand the PNG straight to Instagram/WhatsApp.
     Downloading a story-sized image to the camera roll is a strictly worse path
     when the OS can pass it to the app directly. */
  const canShareFiles = typeof navigator !== 'undefined' && !!navigator.canShare;

  const saveImage = async () => {
    await Promise.all([ensureCardFont(), ensureCardEmoji(fp.emoji)]);
    const cv = drawShareCard(fp, { total, max, day, scores, format: 'story' });
    if (canShareFiles) {
      try {
        const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
        const file = new File([blob], `${BRAND.name.toLowerCase()}-story.png`, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await shareOrFallThrough({ files: [file] });
          return;
        }
      } catch (e) { if (e?.name === 'AbortError') return; /* else fall through to download */ }
    }
    cv.toBlob(blob => {
      if (!blob) return say('Could not save');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      // Was the internal day index (289). Players see #1, #2, ... — the file should match.
      const n = puzzleLabel(day).replace('#', '').toLowerCase();
      a.href = url; a.download = `${BRAND.name.toLowerCase()}-${n}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      // Revoking immediately races the download in Safari; one tick is enough.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      say('Saved to your downloads');
    }, 'image/png');
  };

  const copyChallenge = async () => {
    try { localStorage.setItem('sq.name', name); } catch { /* private mode */ }
    const link = challengeLink(name, total, day);
    const text = `I scored ${total}/${max} on ${BRAND.name} ${puzzleLabel(day)}. Beat it:\n${link}`;
    /* The button says "Copy challenge link", so it copies — on every browser.
       It used to hand off to navigator.share whenever that existed, which on
       Chrome desktop is always, so the one browser most people test in opened a
       share sheet instead and the "Copied!" confirmation was unreachable. A
       button that does something other than what it says is a bug even when the
       other thing is useful. Sharing lives on its own button. */
    try {
      await navigator.clipboard.writeText(text);
      say('Copied!');
    } catch {
      // Clipboard needs a secure context and a user gesture; a share sheet is
      // better than nothing when it is unavailable.
      if (navigator.share) {
        try { await shareOrFallThrough({ text }); return; } catch { /* fall through */ }
      }
      say('Copy failed');
    }
  };


  const doShare = async () => {
    const text = shareText(fp, { total, max, day, scores });
    try {
      const cv = cardRef.current?.querySelector('canvas');
      // Try the image first; a picture of your Fingerprint travels much further
      // than text, and Web Share handles files on most phones.
      if (cv && navigator.canShare) {
        const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
        const file = new File([blob], `${BRAND.name.toLowerCase()}.png`, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await shareOrFallThrough({ files: [file], text });
          return;
        }
      }
      if (navigator.share) { await shareOrFallThrough({ text }); return; }
      await navigator.clipboard.writeText(text);
      say('Copied!');
    } catch (e) {
      if (e?.name === 'AbortError') return;
      try { await navigator.clipboard.writeText(text); say('Copied!'); } catch { say('Copy failed'); }
    }
  };


  const byMode = Object.entries(
    answers.reduce((m, a) => { (m[a.mode] ||= []).push(a.score); return m; }, {})
  ).map(([k, v]) => ({ k, mean: Math.round(v.reduce((x, y) => x + y, 0) / v.length) }))
   .sort((a, b) => b.mean - a.mean);

  return (
    <motion.div className="results" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <div className="card totalcard">
        <Mascot mood={moodFor(Math.round(total / Math.max(1, answers.length)))} size={64} />
        <p className="tlabel">{label}</p>
        <p className="tbig">{total}<span className="tmax">/{max}</span></p>
        <div className="sqrow">
          {scores.map((s, i) => (
            /* Flipped in one at a time. Sixteen squares appearing at once is a
               block of colour; sixteen arriving in sequence is a result. */
            <motion.span key={i} className={'sq ' + band(s)}
              initial={{ rotateX: -90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              transition={{ delay: i * 0.07, duration: .32, ease: 'easeOut' }} />
          ))}
        </div>
      </div>

      <div className="card fpcard">
        {/* The image preview below already shows the emoji, title and blurb, so
            repeating them above was the same claim twice and doubled the page
            height. Only the tags survive here — they are not on the card. */}
        <h2 className="shead">Your Bias Fingerprint</h2>
        <div className="fptags">{fp.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
        <div ref={cardRef} className="cardpreview" aria-label="Your shareable result card" />
        <div className="actions">
          <button className="btn btn-primary grow" onClick={doShare}>Share result</button>
          <button className="btn btn-ghost" onClick={saveImage} title="1080 × 1920, sized for stories">
            {canShareFiles ? 'Share to story' : 'Save image'}
          </button>
        </div>
      </div>

      <div className="card challengecard">
        <h2 className="shead">Challenge a friend</h2>
        <p className="stubtext">
          They get today’s exact set and your score to beat. No sign-up, no app.
        </p>
        <div className="challengerow">
          <input className="namein" value={name} maxLength={24} placeholder="Your name (optional)"
                 onChange={e => setName(e.target.value)} aria-label="Your name" />
          <button className="btn btn-primary" onClick={copyChallenge}>Copy challenge link</button>
        </div>
      </div>

      {/* The Instagram waitlist card lived here. It promised "you are on the
          list" and only ever set sq.ig=1 in localStorage — nobody was ever going
          to be told anything. A broken promise on the results screen is worse
          than no card. It comes back as a real "Follow @handle" button when the
          account exists (see HANDLES in About.jsx). */}

      <AdSlot slot="results" />

      {/* Collapsed by default. It is the longest block on the page and the least
          urgent — the score, the fingerprint and the share buttons come first. */}
      <details className="card breakdown">
        <summary className="shead">How you did, game by game</summary>
        <div className="statbars">
          {byMode.map(r => (
            <div key={r.k} className="sbar">
              <span className="sbl">{GAMES[r.k].name}</span>
              <span className="sbt"><motion.i style={{ background: GAMES[r.k].colour }}
                initial={{ width: 0 }} animate={{ width: r.mean + '%' }} transition={{ duration: .5 }} /></span>
              <span className="sbv">{r.mean}</span>
            </div>
          ))}
        </div>
      </details>

      {isDaily && (
        <div className="card nextset">
          <p className="shead">Next set in <Countdown /></p>
          <p className="stubtext">Sixteen new questions at midnight, your time.</p>
        </div>
      )}

      {/* Context-appropriate actions. "Play again" used to fire for every kind of
          session, including archive ones that carry no mode to replay. */}
      <div className="actions">
        <button className="btn btn-ghost grow" onClick={onHome}>← Home</button>
        {kind === 'archive' && (
          <button className="btn btn-primary grow" onClick={onArchive}>Play another day</button>
        )}
        {kind === 'practice' && onAgain && (
          <button className="btn btn-primary grow" onClick={onAgain}>Play 5 more</button>
        )}
      </div>
      {toast && (
        <motion.div className="toast" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {toast}
        </motion.div>
      )}
    </motion.div>
  );
}
const band = s => s >= 85 ? 'a' : s >= 60 ? 'b' : s >= 35 ? 'c' : 'd';
