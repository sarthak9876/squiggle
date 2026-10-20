import { useCallback, useEffect, useMemo, useState } from 'react';
/* framer-motion defaults to reducedMotion:'never' — it ignores the OS setting
   unless told otherwise, and the CSS * rule in base.css cannot reach it because
   framer writes inline styles every frame. One wrapper covers every animation. */
import { MotionConfig } from 'framer-motion';
import Home from './components/Home.jsx';
import Lnk from './components/Lnk.jsx';
import GameScreen from './components/GameScreen.jsx';
import Results from './components/Results.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Archive from './components/Archive.jsx';
import About, { CREDITS } from './components/About.jsx';
import SquiggleMark from './components/SquiggleMark.jsx';
import RepoLink from './components/RepoLink.jsx';
import { BRAND } from './brand.js';
import NotFound from './components/NotFound.jsx';
import { Privacy, Terms } from './components/Legal.jsx';
import { checkRunway } from './lib/runway.js';
import { load, patch, playerId, mergeInflight } from './lib/storage.js';
import { isMuted, setMuted } from './lib/juice.js';
import { dayNumber, lineupFor, SLOTS, LAUNCH_DAY, puzzleNumber } from './lib/schedule.js';
import { slotKey } from './lib/slotkey.js';
import { POOLS } from './modes/index.js';
import { GAMES } from './games.jsx';
import { shuffled } from './lib/random.js';
import { parse, go, href, onRouteChange } from './lib/router.js';

export default function App() {
  // The route IS the view. Keeping a second `view` state in parallel is how Back
  // ends up showing one screen with another screen's URL.
  const [route, setRoute] = useState(() => parse());
  useEffect(() => onRouteChange(setRoute), []);
  /* Rewrite the URL to the canonical one for this route. Two games got slugs
     that match their names (/game/shadow -> /game/shapes), and the old URL still
     parses so shared links keep working — this is what stops the address bar
     showing the dead one afterwards. replaceState, not push, so Back does not
     bounce between the two spellings. It also normalises a trailing slash.
     'notfound' is excluded because href() has no path for it and would send
     every 404 to the home page. */
  useEffect(() => {
    if (route.name === 'notfound') return;
    const want = href(route);
    if (want !== location.pathname) history.replaceState({}, '', want);
  }, [route]);
  // Operational, console-only: warn the maintainer long before a player sees repeats.
  useEffect(() => { checkRunway(POOLS); }, []);
  const view = route.name === 'game' ? 'play' : route.name;
  const [lineup, setLineup] = useState(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [session, setSession] = useState(null);      // {kind:'daily'|'practice', mode?}
  const [theme, setTheme] = useState(() => load().theme || 'auto');
  const [muted, setMutedState] = useState(isMuted);
  const [tick, setTick] = useState(0);
  const pid = useMemo(() => playerId(), []);
  const state = useMemo(() => load(), [tick, view]);
  const day = dayNumber();

  /* A challenge link — /play?vs=1291&from=Asha — lands here. Read once: the
     params are stripped from the URL after the run starts so a refresh mid-game
     does not resurrect a challenge the player already saw, and so sharing your
     own address bar does not pass on somebody else's score. */
  const challenge = useMemo(() => {
    const q = new URLSearchParams(location.search);
    const vs = parseInt(q.get('vs'), 10);
    if (!Number.isFinite(vs) || vs < 0 || vs > SLOTS.length * 100) return null;
    return { vs, from: (q.get('from') || '').slice(0, 24) };
  }, []);

  // A streak that has already been broken must not be displayed as if it were
  // alive. It is only current if you played yesterday or today.
  const streakAlive = state.lastDay != null && (state.lastDay === day || state.lastDay === day - 1);
  const stats = {
    streak: streakAlive ? (state.streak || 0) : 0,
    streakLost: !streakAlive && (state.streak || 0) > 0,
    best: state.best || 0,
    days: Object.keys(state.days || {}).length,
  };
  const playedToday = !!(state.answers && state.answers[day]);

  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'auto') el.removeAttribute('data-theme'); else el.setAttribute('data-theme', theme);
    patch(s => ({ ...s, theme }));
  }, [theme]);

  const startDaily = useCallback(() => {
    const s = load();
    // One attempt a day. Replaying would make the streak and the Fingerprint
    // meaningless, since you could grind the same set until it flattered you.
    if (s.answers && s.answers[day]) {
      setAnswers(s.answers[day]);
      setLineup(lineupFor(POOLS, pid, day));
      setSession({ kind: 'daily', replay: true });
      go({ name: 'results' }, { replace: true });
      return;
    }
    // Resume an unfinished run rather than restarting it.
    const flight = s.inflight && s.inflight.day === day ? s.inflight : null;
    setLineup(lineupFor(POOLS, pid, day));
    setAnswers(flight ? flight.answers : []);
    setIdx(flight ? Math.min(flight.idx, SLOTS.length - 1) : 0);
    setSession({ kind: 'daily' });
    go({ name: 'play' });
  }, [pid, day]);

  /* Arriving on a challenge link should drop you straight into the set, not onto
     a home page you have to decode. Declared after startDaily so it can simply
     depend on it, rather than reaching through a ref. */
  useEffect(() => {
    if (challenge && route.name === 'play' && !lineup) startDaily();
  }, [challenge, route.name, lineup, startDaily]);

  /* Questions scheduled for the dailies, TODAY and the next week. Practice used
     to draw from the same bank with no exclusion, so playing "Play 5" could hand
     you three of tomorrow's sixteen — and then tomorrow's set was partly spoiled.

     It started at day + 1, which left today's own set unguarded: before you have
     played it, today's sixteen are exactly as spoilable as tomorrow's. The hero's
     "Try one" demo had the same hole from the other side — it picked a What
     Share? question by day number alone, so on 1.7% of player-days it was one of
     that day's sixteen and you met your own answer again. Starting the loop at
     `day` closes both. Thinning the pool is safe: startPractice falls back to the
     full bank if fewer than five survive, so a mode is never unplayable. */
  const spoilerIds = useMemo(() => {
    const ids = new Set();
    for (let d = day; d <= day + 7; d++)
      for (const slot of lineupFor(POOLS, pid, d)) ids.add(slot.item.id);
    return ids;
  }, [day, pid]);

  const startPractice = useCallback((mode, resume = true) => {
    if (!POOLS[mode]) { go({ name: 'home' }, { replace: true }); return; }
    const s = load();
    const saved = resume && (s.practice || {})[mode];
    const pool = POOLS[mode];

    // Resume rather than reroll. A refresh used to hand you five different
    // questions and throw away the answers you had already given.
    if (saved && Array.isArray(saved.ids) && saved.ids.length) {
      const items = saved.ids.map(id => pool.find(q => String(q.id) === String(id))).filter(Boolean);
      if (items.length === saved.ids.length) {
        setLineup(items.map(item => ({ mode, item })));
        setAnswers(saved.answers || []);
        setIdx(Math.min(saved.idx || 0, items.length - 1));
        setSession({ kind: 'practice', mode });
        go({ name: 'game', id: mode });
        return;
      }
    }

    const seen = (s.lastPractice || {})[mode] || [];
    // Never redraw the questions you just saw. Drawing 5 from a pool of 15 repeats
    // ~1.7 of them every time by arithmetic; excluding the last round is the only
    // thing that makes consecutive replays feel genuinely new.
    const seed = (Date.now() & 0xffffffff) >>> 0;
    const usable = pool.filter(q => !spoilerIds.has(q.id));
    const base = usable.length >= 5 ? usable : pool;    // never leave the mode unplayable
    let fresh = shuffled(base.filter(q => !seen.includes(q.id)), seed);
    if (fresh.length < 5) fresh = fresh.concat(shuffled(base.filter(q => seen.includes(q.id)), (seed ^ 0x9e3779b9) >>> 0));
    const picked = fresh.slice(0, Math.min(5, base.length));
    patch(st => ({
      ...st,
      lastPractice: { ...(st.lastPractice || {}), [mode]: picked.map(q => q.id) },
      practice: { ...(st.practice || {}), [mode]: { ids: picked.map(q => q.id), answers: [], idx: 0 } },
    }));
    setLineup(picked.map(item => ({ mode, item })));
    setAnswers([]); setIdx(0);
    setSession({ kind: 'practice', mode });
    go({ name: 'game', id: mode });
  }, [spoilerIds]);

  const onAnswer = useCallback(a => setAnswers(prev => {
    const next = [...prev, a];
    // Saved after every single answer, not at the end. A refresh at question 7
    // used to throw the whole run away.
    if (session?.kind === 'daily' && !session.replay) {
      // Longer list wins — see mergeInflight. A second tab must not roll you back.
      patch(s => ({ ...s, inflight: mergeInflight(s.inflight, next, day) }));
    } else if (session?.kind === 'practice') {
      patch(s => ({
        ...s,
        practice: { ...(s.practice || {}),
          [session.mode]: { ...((s.practice || {})[session.mode] || {}),
                            answers: next, idx: next.length } },
      }));
    }
    return next;
  }), [session, day]);

  const onNext = useCallback(() => {
    if (idx + 1 >= lineup.length) {
      // Only the real daily banks. Archive and practice are replayable by design,
      // so letting them write would make the streak and the leaderboard meaningless.
      if (session.kind === 'daily') bankDay(answers);
      // An archive play is still a play: record the score so the tile stops
      // reading "–", but flag it so it can never touch streak, best or the
      // Fingerprint's idea of "today".
      else if (session.kind === 'archive') bankArchive(session.day, answers);
      else if (session.kind === 'practice') {
        patch(s => {
          if (s.practice) delete s.practice[session.mode];
          return s;
        });
      }
      // replace: Back from results should return to home, not re-enter a finished game.
      go({ name: 'results' }, { replace: true });
    } else setIdx(i => i + 1);
  }, [idx, lineup, session, answers]);

  /* Separate from bankDay on purpose. Sharing one function with an `archive` flag
     would put a branch inside streak arithmetic, which is exactly where a bug
     costs a player something they cannot get back. */
  function bankArchive(d, final) {
    const total = final.reduce((a, b) => a + b.score, 0);
    patch(s => {
      s.archive = s.archive || {};
      s.archive[d] = { total, answers: final };
      return s;
    });
    setTick(t => t + 1);
  }

  function bankDay(final) {
    const total = final.reduce((a, b) => a + b.score, 0);
    patch(s => {
      s.days = s.days || {}; s.answers = s.answers || {};
      if (s.days[day] != null) return s;
      s.days[day] = total;
      s.answers[day] = final;
      const gap = s.lastDay != null ? day - s.lastDay : 999;
      // One free missed day a week, applied silently. A freeze you have to remember
      // to claim does not work — by then you have already felt the loss.
      if (gap === 1) s.streak = (s.streak || 0) + 1;
      else if (gap === 2 && s.insuranceWeek !== Math.floor((day + 4) / 7)) {
        s.streak = (s.streak || 0) + 1; s.insuranceWeek = Math.floor((day + 4) / 7);
      } else s.streak = 1;
      s.lastDay = day;
      s.best = Math.max(s.best || 0, total);
      delete s.inflight;
      s.modes = s.modes || {};
      for (const a of final) {
        const m = s.modes[a.mode] || { n: 0, sum: 0, best: 0 };
        m.n++; m.sum += a.score; m.best = Math.max(m.best, a.score);
        s.modes[a.mode] = m;
      }
      return s;
    });
    setTick(t => t + 1);
  }

  /* A SPA keeps one <title> unless it is told otherwise, so every route shared the
     home title — bad for a shared link, a bookmark and a crawler alike. */
  useEffect(() => {
    const T = {
      home: `${BRAND.name} — ${BRAND.tagline}`,
      play: `Playing today’s 16 · ${BRAND.name}`,
      game: `Practice · ${BRAND.name}`,
      results: `Your result · ${BRAND.name}`,
      archive: `Archive · ${BRAND.name}`,
      about: `About · ${BRAND.name}`,
      privacy: `Privacy · ${BRAND.name}`,
      terms: `Terms · ${BRAND.name}`,
      notfound: `Page not found · ${BRAND.name}`,
    };
    document.title = T[route.name] || T.home;
    const can = document.querySelector('link[rel="canonical"]');
    if (can) can.setAttribute('href', BRAND.url.replace(/\/$/, '') + (route.name === 'home' ? '/' : location.pathname));
  }, [route.name]);

  /* Two tabs, one localStorage. Finishing the daily in tab A left tab B showing
     "Continue · 2 of 16" forever, and clicking it resumed a run that no longer
     existed. The `storage` event only fires in OTHER tabs, which is exactly the
     case we need. */
  useEffect(() => {
    const onStorage = e => {
      if (e.key && e.key !== BRAND.storageKey) return;
      setTick(t => t + 1);
      const fresh = load();
      const doneElsewhere = !!(fresh.answers && fresh.answers[day]);
      // If this tab is mid-run on a day that was completed elsewhere, stop
      // pretending — send it to the result rather than a stale question.
      if (doneElsewhere && route.name === 'play' && session?.kind === 'daily' && !session.replay) {
        setAnswers(fresh.answers[day]);
        setSession({ kind: 'daily', replay: true });
        go({ name: 'results' }, { replace: true });
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [day, route.name, session]);

  const goHome = useCallback(() => { go({ name: 'home' }); setTick(t => t + 1); }, []);

  /* /results can be entered cold — a refresh, a shared link, the Back button.
     Rebuilt here in RENDER rather than in an effect, because an effect runs after
     the first paint and that paint is what used to crash: `session.kind` was
     evaluated as a prop inside App's OWN render, which is above the ErrorBoundary
     App returns, so nothing could catch it and the page went white. */
  const coldResults = useMemo(() => {
    if (route.name !== 'results' || session) return null;
    const s = load();
    const saved = s.answers && s.answers[day];
    if (!Array.isArray(saved) || !saved.length) return null;
    return { session: { kind: 'daily', replay: true }, answers: saved,
             lineup: lineupFor(POOLS, pid, day) };
  }, [route.name, session, day, pid, tick]);

  // Everything the view layer reads goes through these, so a null session can
  // never reach a `.kind`.
  const vSession = session || (coldResults && coldResults.session) || null;
  const vAnswers = answers.length ? answers : (coldResults ? coldResults.answers : []);
  const vLineup  = lineup || (coldResults && coldResults.lineup) || null;
  const canShowResults = !!vSession && vAnswers.length > 0;

  // A direct link or a refresh must rebuild the session rather than show a blank
  // screen. /game/:id starts that game; /play resumes or starts the daily.
  useEffect(() => {
    if (route.name === 'game' && GAMES[route.id] && (!session || session.mode !== route.id || !lineup)) {
      startPractice(route.id);
    } else if (route.name === 'play' && !lineup) {
      startDaily();
    } else if (route.name === 'game' && !GAMES[route.id]) {
      go({ name: 'home' }, { replace: true });
    } else if (route.name === 'results' && !canShowResults) {
      // Nothing to show and nothing on disk to rebuild from — go home rather than
      // sit on an empty /results.
      go({ name: 'home' }, { replace: true });
    }
  }, [route.name, route.id]);

  return (
    <MotionConfig reducedMotion="user">
    <div className="shell">
      <header className="topbar">
        <button className="brand" onClick={goHome} aria-label={BRAND.name + ' home'}>
          <SquiggleMark size={26} animate={false} />
          <span className="brandname">{BRAND.name}</span>
        </button>
        <span className="spacer" />
        {stats.streak > 0 && <span className="streakchip" title="Day streak">{stats.streak}🔥</span>}
        <RepoLink />
        {/* Reachable BEFORE the first sound plays. It used to live inside the
            reveal card, i.e. only after you had already been surprised by it. */}
        <button className="iconbtn" aria-pressed={!muted}
          onClick={() => { setMuted(!muted); setMutedState(!muted); }}
          aria-label={muted ? 'Sound off. Turn sound on.' : 'Sound on. Turn sound off.'}
          title={muted ? 'Sound off' : 'Sound on'}>
          {/* SVG, not an emoji — the platform glyphs are a muddy blob at 15px
              and sat badly next to the crisp GitHub mark. */}
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round"
               strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H2v6h4l5 4z" />
            {muted
              ? <><path d="m23 9-6 6" /><path d="m17 9 6 6" /></>
              : <><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a9 9 0 0 1 0 14" /></>}
          </svg>
        </button>
        {/* Was a three-way cycle where "system" and "dark" looked identical on a
            dark machine, with no label saying which you were on. Now it names the
            NEXT state, which is the only thing a toggle needs to tell you. */}
        <button className="iconbtn"
          onClick={() => setTheme(t => (t === 'auto' ? 'light' : t === 'light' ? 'dark' : 'auto'))}
          aria-label={theme === 'auto' ? 'Theme: following your system. Switch to light.'
            : theme === 'light' ? 'Theme: light. Switch to dark.'
            : 'Theme: dark. Switch to system.'}
          title={theme === 'auto' ? 'System theme — tap for light'
            : theme === 'light' ? 'Light — tap for dark'
            : 'Dark — tap to follow your system'}>
          {theme === 'auto' ? '◐' : theme === 'light' ? '☀' : '☾'}
        </button>
      </header>

      <main className="main">
        {/* keyed on the route: navigating anywhere clears a crashed screen,
            so the logo and the footer links work again without a reload. */}
        <ErrorBoundary key={route.name + (route.id || '')} onReset={goHome}>
        {view === 'home' && (
          <Home stats={stats} playedToday={playedToday} spoilerIds={spoilerIds}
                progress={state.inflight && state.inflight.day === day ? state.inflight.idx : 0}
                preLaunch={day < LAUNCH_DAY}
                onPlayDaily={startDaily} onPlayGame={startPractice} />
        )}
        {view === 'notfound' && <NotFound path={route.path} onHome={goHome} onPlayGame={startPractice} />}
        {view === 'play' && lineup && session && (
          /* Remount whenever the QUESTION changes, not just the index. GameScreen
             seeds its answer state once, with `useState(() => mode.init(item))`,
             so a key that misses a swap leaves the new mode reading the previous
             mode's value shape — size/share expect {v}, order/draw expect arrays.
             key={idx} alone missed the mode swap at a fixed index (/game/a →
             /game/b both sit at idx 0), which threw on 27 of 56 mode pairs.
             Mode + item id + index covers all three ways a slot can change. */
          <GameScreen key={slotKey(lineup[idx], idx)} lineup={lineup} idx={idx} answers={answers} challenge={challenge} onAnswer={onAnswer} onNext={onNext}
            onQuit={goHome}
            /* Only a daily run is banked. Archive and practice are replayable by
               design, so counting them would let you grind a mode until the
               number flattered you — and the number would then vanish on reload,
               because nothing wrote it. */
            banked={session.kind === 'daily'}
            /* Only these two write an in-flight record (see onAnswer). An
               archive run is held in memory, so leaving it really does lose it
               and the quit dialog must not promise otherwise. */
            resumable={session.kind === 'daily' || session.kind === 'practice'}
            label={session.kind === 'daily' ? 'Today'
              : session.kind === 'archive' ? 'Archive'
              : (GAMES[session.mode] || {}).name || 'Practice'} />
        )}
        {view === 'archive' && (
          <Archive onHome={goHome} onPlayDay={(d) => {
            if (d < LAUNCH_DAY || d > day) return;   // never before launch, never the future
            setLineup(lineupFor(POOLS, pid, d));
            setAnswers([]); setIdx(0);
            setSession({ kind: 'archive', day: d });
            go({ name: 'play' });
          }} />
        )}
        {view === 'about' && <About onHome={goHome} />}
        {view === 'privacy' && <Privacy onHome={goHome} />}
        {view === 'terms' && <Terms onHome={goHome} />}
        {view === 'results' && canShowResults && (
          <Results answers={vAnswers} lineup={vLineup}
            kind={vSession.kind}
            /* Was always today's number, so an archive result shared as "#289"
               when it was a different day's set entirely. */
            day={vSession.kind === 'archive' ? vSession.day : day}
            isDaily={vSession.kind === 'daily'}
            label={vSession.kind === 'daily'
              ? (vSession.replay ? "Today's result" : "Today's total")
              : vSession.kind === 'archive' ? 'Archive · past set'
              : ((GAMES[vSession.mode] || {}).name || 'Practice') + ' · practice'}
            onHome={goHome}
            onArchive={() => go({ name: 'archive' })}
            /* "Play again" used to call startPractice(session.mode); an archive or
               daily session has no mode, so it reached GAMES[undefined]. */
            onAgain={vSession.kind === 'practice' && GAMES[vSession.mode]
              ? () => startPractice(vSession.mode, false) : null} />
        )}
        </ErrorBoundary>
      </main>

      <footer className="foot">
        <nav className="footlinks">
          <Lnk route={{ name: 'archive' }}>Archive</Lnk>
          <Lnk route={{ name: 'about' }}>About</Lnk>
          <Lnk route={{ name: 'privacy' }}>Privacy</Lnk>
          <Lnk route={{ name: 'terms' }}>Terms</Lnk>
          {CREDITS.socials.map(s => (
            <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
          ))}
        </nav>
        <p>Sixteen new questions every day at midnight, your time.</p>
        <p className="fine">
          No account, no tracking, no data leaves your browser.
          Made by {CREDITS.author}.
        </p>
      </footer>
    </div>
    </MotionConfig>
  );
}
