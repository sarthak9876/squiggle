import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MODES, promptOf, noteOf, sourceOf, hintOf } from '../modes/index.js';
import { SIL } from '../content/emoji.js';
import { GAMES } from '../games.jsx';
import Reveal from './Reveal.jsx';
import Mascot, { moodFor } from './Mascot.jsx';
import { react } from '../lib/juice.js';
import { CROWD_ENABLED } from '../lib/flags.js';
import { reportLink } from '../lib/report.js';
import { dayNumber } from '../lib/schedule.js';
import { HINT_KEEP, applyHint } from '../lib/hint.js';

/* A face for the fact. Picked from the question's own theme so it is never
   random, and it gives the card a flash of colour that a paragraph cannot. */
const FACT_ICONS = {
  space:'\ud83d\ude80', planets:'\ud83e\ude90', moonsun:'\u2600\ufe0f', missions:'\ud83d\udef0\ufe0f',
  animals:'\ud83d\udc3e', wildlife:'\ud83d\udc06', sealife:'\ud83d\udc0b', birds:'\ud83d\udc26', bugs:'\ud83d\udc1b',
  pets:'\ud83d\udc36', fossil:'\ud83e\uddb4', biology:'\ud83e\uddec', health:'\u2764\ufe0f', disease:'\ud83e\udda0',
  food:'\ud83c\udf5b', nutrition:'\ud83e\udd57', drinks:'\u2615', farming:'\ud83c\udf3e',
  money:'\ud83d\udcb0', economy:'\ud83d\udcc8', prices:'\ud83c\udff7\ufe0f', tech:'\ud83d\udcbb', web:'\ud83c\udf10',
  devices:'\ud83d\udcf1', social:'\ud83d\udcac', streaming:'\ud83c\udfac', film:'\ud83c\udfa5',
  energy:'\u26a1', renewables:'\ud83c\udf1e', climate:'\ud83c\udf21\ufe0f', warming:'\ud83d\udd25',
  geography:'\ud83d\uddfa\ufe0f', cities:'\ud83c\udfd9\ufe0f', demography:'\ud83d\udc65', history:'\ud83d\udcdc',
  ancient:'\ud83c\udffa', inventions:'\ud83d\udca1', language:'\ud83d\udde3\ufe0f', culture:'\ud83c\udfad',
  sport:'\ud83c\udfc5', rail:'\ud83d\ude82', road:'\ud83d\ude97', aviation:'\u2708\ufe0f', space2:'\ud83c\udf0c',
  icewater:'\ud83e\uddca', batteries:'\ud83d\udd0b', lifestyle:'\ud83c\udfe0', modern:'\u2728',
};
/* The question knows its own subject; the theme only knows its neighbourhood.
   A "how long is a BUS" question is themed `road`, and `road` maps to a car — so
   the fact about a bus was illustrated with a car. Ask the question first. */
const factIcon = item => {
  const subject = item?.target?.key || item?.key;
  if (subject && SIL[subject]) return SIL[subject];
  const theme = item?.theme;
  if (!theme) return '\ud83d\udca1';
  if (FACT_ICONS[theme]) return FACT_ICONS[theme];
  // India themes are "india-rail", "india-food" and so on — fall back to the tail.
  const tail = String(theme).split('-').pop();
  return FACT_ICONS[tail] || '\ud83d\udca1';
};

/* Distance words only make sense where the answer IS a distance. Shapes Only
   scores 0 or 100 and Odd One Out 0, 50 or 100 — "nowhere near" a four-way pick
   reads as mockery rather than feedback. */
const PICKED = { shadow: true, odd: true };
const verdict = (s, mode) => {
  if (PICKED[mode]) {
    return s >= 100 ? ['Correct', 'good']
         : s > 0    ? ['Half right', 'soft']
         : ['Wrong pick', 'accent'];
  }
  return s >= 95 ? ['Spot on', 'good'] : s >= 85 ? ['Very close', 'good'] :
         s >= 65 ? ['Close', 'ink'] : s >= 40 ? ['Some of it', 'soft'] :
         s >= 15 ? ['Not quite', 'soft'] : ['Nowhere near', 'accent'];
};

/** One question at a time. Knows nothing about any specific game — it only speaks
 *  the mode contract, which is what keeps this file small while eight very different
 *  mechanics plug into it. */
export default function GameScreen({ lineup, idx, answers = [], challenge, onAnswer, onNext, onQuit, label, banked = false, resumable = false }) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, [idx]);
  const slot = lineup[idx];
  const mode = MODES[slot.mode];
  const game = GAMES[slot.mode];
  const [value, setValue] = useState(() => mode.init(slot.item));
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [shown, setShown] = useState(0);              // count-up display
  const [confirmQuit, setConfirmQuit] = useState(false);
  /* A hint is offered only where the question names something a player may
     simply never have heard of ("measured at Mauna Loa"). Not knowing WHAT is
     being asked is frustration, not difficulty — but being told costs points,
     so it stays a real choice. */
  const [hinted, setHinted] = useState(false);
  const rcardRef = useRef(null);
  const barRef = useRef(null);

  /* Publish the real height of the sticky bar. A hard-coded padding guess goes
     wrong the moment a button wraps to two lines, which is exactly what happens
     to "Make your guess" at 360px. */
  useEffect(() => {
    const el = barRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => {
      const h = Math.ceil(e.contentRect.height);
      if (h > 0) document.documentElement.style.setProperty('--actionbar-h', h + 'px');
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [revealed]);

  // Running total so far. The score was only ever visible at the end, which made
  // the middle of a 16-question run feel like it did not count.
  const runTotal = useMemo(() => answers.reduce((t, a) => t + a.score, 0), [answers]);
  // A streak of good answers, counted backwards from the latest.
  const combo = useMemo(() => {
    let n = 0;
    for (let i = answers.length - 1; i >= 0 && answers[i].score >= 80; i--) n++;
    return n;
  }, [answers]);
  const half = lineup.length >> 1;
  const [halfSeen, setHalfSeen] = useState(false);
  // Shown once, between question 8 and question 9: a 16-question run is long
  // enough that the middle needs a landmark, or it reads as an endless list.
  /* Only the long daily run needs a landmark in the middle. A 5-question practice
     round was interrupting itself after question 2 with "2 questions to go", which
     is a milestone card for a journey that has barely started. */
  const atHalfway = lineup.length >= 10 && idx === half && answers.length === half && !halfSeen;
  const isLast = idx + 1 === lineup.length;

  const submit = useCallback(() => {
    let ok = false;
    try { ok = mode.ready(value, slot.item); } catch { ok = false; }
    if (revealed || !ok) return;
    const raw = mode.score(slot.item, value);
    // A hinted answer still counts, at three quarters. Harsh enough to be a
    // decision, mild enough that taking the hint beats closing the tab.
    const s = applyHint(raw, hinted);
    setScore(s); setRevealed(true);
    onAnswer({
      mode: slot.mode, score: s, hinted,
      signedError: mode.signedError?.(slot.item, value),
      extremity: mode.extremity?.(slot.item, value),
      magnitude: mode.magnitude?.(slot.item),
    });
  }, [revealed, value, slot, mode, onAnswer, hinted]);

  /* On a 900px-tall screen the reveal card pushed Next below the fold and the run
     felt stalled. Scroll the reveal into view instead of leaving it to luck. */
  useEffect(() => {
    if (!revealed || !rcardRef.current) return;
    const t = setTimeout(() => {
      try {
        rcardRef.current?.scrollIntoView({
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          block: 'nearest',
        });
      } catch { /* older browsers ignore the options object */ }
    }, 120);
    return () => clearTimeout(t);
  }, [revealed]);

  /* Confetti / tone / buzz, fired once when the score lands. The cleanup matters:
     tapping Next during the burst unmounts this card, and an rAF loop drawing into
     a detached canvas is exactly the leak that bit the reveal animation before. */
  useEffect(() => {
    if (!revealed) return;
    const stop = react(score, rcardRef.current);
    return () => stop?.();
  }, [revealed, score]);

  // Score counts up rather than appearing. A number that climbs reads as earned.
  useEffect(() => {
    if (!revealed) return;
    // Reduced motion gets the number, not the climb — the information either way.
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(score);
      return;
    }
    let raf, t0 = performance.now();
    const tick = t => {
      // 650ms meant the score was still climbing well after the panel had
      // arrived. The whole reveal should be readable inside ~400ms.
      const p = Math.min(1, (t - t0) / 320);
      setShown(Math.round(score * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [revealed, score]);

  /* Keyboard: Enter submits, then Enter advances. Playable without a mouse.

     The Enter branch used to preventDefault() unconditionally on a WINDOW
     listener, which cancelled native activation for every button and link while
     this screen was mounted — Enter on a tile did nothing, Enter on a footer
     link did nothing, and Enter on RESET submitted the question instead of
     clearing it. Only act when focus is somewhere that has no Enter behaviour of
     its own; a focused control handles its own key.

     Escape called onQuit() outright, so the one key people press to dismiss a
     dialog threw the run away — including from inside the "Leave this set?"
     dialog that exists to prevent exactly that. It now toggles that dialog. */
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Enter') {
        const el = document.activeElement;
        if (el && el.closest('button, a, input, select, textarea, [role="button"], [role="slider"]')) return;
        e.preventDefault();
        revealed ? onNext() : submit();
      }
      if (e.key === 'Escape') setConfirmQuit(q => !q);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, submit, onNext, onQuit]);

  const [vLabel, vTone] = verdict(score, slot.mode);
  // Guarded: a thrown predicate used to unmount the entire app with no error
  // boundary above it. Failing closed (not ready) is always safe.
  let ready = false;
  try { ready = mode.ready(value, slot.item); } catch { ready = false; }
  const qid = slot.item.id || promptOf(slot.item).slice(0, 24);

  if (atHalfway) {
    /* Name every game that tied. Saying "100 on Shapes Only" when three games
       scored 100 reads as a bug to the person who just played them. */
    const topScore = Math.max(...answers.map(a => a.score));
    const tied = [...new Set(answers.filter(a => a.score === topScore).map(a => GAMES[a.mode].name))];
    /* Cap the list. Every game can tie — most obviously at zero — and joining
       eight names turned a one-line encouragement into a paragraph of the games
       you had just failed. Two names and a count says the same thing. */
    const bestNames = tied.length === 1 ? tied[0]
      : tied.length === 2 ? tied[0] + ' and ' + tied[1]
      : `${tied[0]}, ${tied[1]} and ${tied.length - 2} more`;
    const avg = Math.round(runTotal / answers.length);
    return (
      <motion.div className="play halfway" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="card halfcard">
          <Mascot mood={moodFor(avg)} size={92} />
          <h2>Halfway</h2>
          <p className="bignum">{runTotal}<span className="sub"> / {half * 100}</span></p>
          {/* A top score of zero is not a "best". Naming every game you scored
              nothing on, under the word "best", reads as sarcasm at the exact
              moment someone is deciding whether to carry on. */}
          <p className="halfline">
            {topScore > 0
              ? <>Averaging <b>{avg}</b> a question. Your best so far was{' '}
                  <b>{topScore}</b> on <b>{bestNames}</b>.</>
              : <>No points yet — and nobody is good at all eight of these.
                  There are <b>{half}</b> left.</>}
          </p>
          <p className="halfline sub">{half} questions to go.</p>
          <button className="btn btn-primary wide" onClick={() => setHalfSeen(true)}>
            Keep going
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="play" style={{ '--gc': game.colour }}>
      {challenge && (
        <div className="vsbar">
          <b>{challenge.from || 'A friend'}</b> scored <b>{challenge.vs}</b> on today’s set.
          {' '}You are on <b>{runTotal}</b>.
        </div>
      )}
      {/* A progressbar with no accessible name is announced as just "progress
          bar, 3" — the number with nothing to attach it to. aria-label names it,
          and aria-valuetext gives the spoken form, because "3" out of a max of
          16 is read as a percentage by some screen readers. Caught by Lighthouse
          on the game route (aria-progressbar-name); the home page scored 100
          because it has no progressbar at all. */}
      <div className="progress" role="progressbar"
           aria-label={`Question ${idx + 1} of ${lineup.length}`}
           aria-valuetext={`Question ${idx + 1} of ${lineup.length}`}
           aria-valuenow={idx + 1} aria-valuemin={1} aria-valuemax={lineup.length}>
        {lineup.map((_, i) => (
          <span key={i} className={'pip' + (i < idx ? ' done' : i === idx ? ' now' : '')} />
        ))}
      </div>

      <div className="card qcard">
        <div className="qhead">
          {/* Quit lived in the bottom bar as an 80x100 box. Moving it here is what
              lets the action bar be one row, which is what stops it covering the
              slider on a 667px screen. */}
          <button className="quitx" onClick={() => setConfirmQuit(true)}
                  aria-label="Leave this set" title="Leave this set">✕</button>
          <span className="qcount">{idx + 1} of {lineup.length}</span>
          {answers.length > 0 && (
            <span className="runscore" title="Your score so far">{runTotal} pts</span>
          )}
          {combo >= 3 && (
            <motion.span className="combo" key={combo}
              initial={{ scale: .6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              ⚡ {combo} correct in a row
            </motion.span>
          )}
          <span className="spacer" />
          <span className="gtag">{game.name}</span>
        </div>
        {isLast && <p className="finalflag">Final question</p>}
        <h2 className="qtext">{promptOf(slot.item)}</h2>
        <p className="qhow">{game.how}</p>

        {hintOf(slot.item) && !revealed && (
          hinted
            ? <p className="hintbox"><b>Hint</b> {hintOf(slot.item)}</p>
            : <button type="button" className="hintbtn" onClick={() => setHinted(true)}>
                What is this? <span className="hintcost">−{Math.round((1 - HINT_KEEP) * 100)}%</span>
              </button>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={idx} className="stage"
            initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }} transition={{ duration: .22 }}>
            <mode.Component item={slot.item} value={value} setValue={setValue}
                            revealed={revealed} crowd={revealed && CROWD_ENABLED} />
          </motion.div>
        </AnimatePresence>

        {!revealed && (
          <div className="actions stickyactions" ref={barRef}>
            {mode.clear && (
              <button className="btn btn-reset" onClick={() => setValue(mode.clear(slot.item))}>
                Reset
              </button>
            )}
            {/* One line, always. "Make your guess" wrapped to three lines at 360px
                and tripled the bar's height. */}
            <button className="btn btn-primary grow cta" onClick={submit} disabled={!ready}>
              {ready ? 'Submit' : (game.cta || 'Pick an answer')}
            </button>
          </div>
        )}
      </div>

      {/* Leaving mid-set looked destructive and wasn't — say so, because a player
          who thinks Quit loses their run simply never clicks it. */}
      <AnimatePresence>
        {confirmQuit && (
          <motion.div className="quitsheet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            role="dialog" aria-modal="true" aria-label="Leave this set?">
            <motion.div className="card quitcard"
              initial={{ y: 20 }} animate={{ y: 0 }} exit={{ y: 20 }}>
              <h3 className="shead">Leave this set?</h3>
              {/* It read "Your 1 answer so far are saved" — the noun pluralised
                  and the verb did not — and "Your 0 answers" before you had
                  answered anything. The bigger problem was that it said "saved"
                  for every session: an archive run keeps nothing until the last
                  question, so leaving one really does throw it away. Say which
                  it is. */}
              <p className="stubtext">
                {answers.length === 0
                  ? 'You have not answered anything yet.'
                  : resumable
                    ? `Your ${answers.length} answer${answers.length === 1 ? ' is' : 's are'} saved. You can pick up where you left off.`
                    : `You have answered ${answers.length} of ${lineup.length}. Leaving now loses this run — an archive set is only kept once you finish it.`}
              </p>
              <div className="actions">
                <button className="btn btn-ghost grow" onClick={() => setConfirmQuit(false)}>Keep playing</button>
                <button className="btn btn-primary grow" onClick={onQuit}>Leave</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {revealed && (
          <motion.div className="card rcard" ref={rcardRef}
            initial={{ opacity: 0, y: 16 }}
            // A miss shakes the card. MotionConfig in App.jsx makes Framer honour
            // prefers-reduced-motion; it does NOT do that by default.
            animate={score < 30 ? { opacity: 1, y: 0, x: [0, -9, 8, -5, 0] } : { opacity: 1, y: 0 }}
            /* An explicit duration. With no transition Framer applies its default
               SPRING, which overshoots and settles over roughly a second — so the
               panel carrying the answer took that long to become readable, and a
               retest clocked it at 1-2s. The shake keeps its own timing. */
            transition={{ opacity: { duration: .22 }, y: { duration: .22 },
                          ...(score < 30 ? { x: { duration: .36 } } : {}) }}
            exit={{ opacity: 0 }}>
            {/* One polite announcement carrying the score and the truth, so the
                reveal is not a purely visual event. */}
            <p className="sr-only" role="status" aria-live="polite">
              {vLabel}. {score} out of 100.
              {mode.detail ? ' ' + mode.detail(slot.item, value) : ''} {noteOf(slot.item)}
            </p>
            <div className="rhead">
              <Mascot mood={moodFor(score)} size={48} />
              <span className="rscore">{shown}</span>
              <span className="rof">/ 100</span>
              <span className="spacer" />
              {/* The sound toggle used to sit here, immediately after the
                  verdict, so it read as one phrase: "Spot on 🔇". The header
                  already carries a sound toggle; this was a duplicate in the
                  worst possible place. */}
              <span className={'rverdict tone-' + vTone}>{vLabel}</span>
            </div>
            {/* Wrongness meter — 0% is perfect. Framing the gap rather than the score
                keeps the game's own joke running. */}
            <div className={'scorebar band-' + (score >= 80 ? 'hi' : score >= 40 ? 'mid' : 'lo')}>
              {/* Explicit 0 start: the bar rendered at its CSS width for one frame
                  before framer took over, which read as a score that then dropped. */}
              <motion.span className="sfill" style={{ width: 0 }} initial={{ width: 0 }}
                animate={{ width: score + '%' }} transition={{ duration: .35, delay: .05 }} />
            </div>
            {mode.detail && (
              <p className="rdetail">
                {mode.detail(slot.item, value)}
                {/* Without this, "9 of 9 pairs correctly grouped" sat beside
                    75/100 and read as a scoring bug rather than the hint cost
                    the player chose to pay. */}
                {hinted && (
                  <span className="rhint">
                    {' '}Hint taken — {Math.round((1 - HINT_KEEP) * 100)}% off, so {Math.round(score / HINT_KEEP)} became {score}.
                  </span>
                )}
              </p>
            )}
            {/* The note is the payload — the bit people screenshot. It was the
                third grey paragraph in a row and read as small print. */}
            <motion.div className="funfact"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: .12, duration: .25 }}>
              <span className="ficon" aria-hidden="true">{factIcon(slot.item)}</span>
              <div>
                <p className="flabel">Did you know</p>
                <p className="ftext">{noteOf(slot.item)}</p>
                {sourceOf(slot.item) && <p className="fsrc">{sourceOf(slot.item)}</p>}
              </div>
            </motion.div>
            {/* Every reveal can be reported. The About page said "tell us" and
                offered no way to, so a wrong answer had nowhere to go. */}
            <p className="rreport">
              <a href={reportLink({ day: dayNumber(), mode: slot.mode, id: slot.item.id,
                                    prompt: promptOf(slot.item) })}>
                Something wrong with this question?
              </a>
            </p>
            <Reveal mode={mode} modeKey={slot.mode} item={slot.item} value={value}
                    score={score} qid={qid} banked={banked}
                    history={banked ? [...answers, { mode: slot.mode, score }] : []} />
            {/* Sticky: the reveal card is long (score, detail, note, source, crowd
                histogram) and on a phone Next sat below the fold, so the run felt
                like it had stalled. It now rides the bottom of the viewport. */}
            <div className="stickynext">
              <button className="btn btn-primary wide" onClick={onNext}>
                {idx + 1 >= lineup.length ? 'See your result' : 'Next question'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
