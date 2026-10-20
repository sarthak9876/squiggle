import { motion } from 'framer-motion';
import { GAME_LIST, ICONS } from '../games.jsx';
import { SquiggleHero } from './SquiggleMark.jsx';
import Countdown from './Countdown.jsx';
import TryOne from './TryOne.jsx';
import AdSlot from './AdSlot.jsx';
import { SLOTS } from '../lib/schedule.js';
import { BRAND } from '../brand.js';

const stagger = { show: { transition: { staggerChildren: 0.035 } } };
const riseIn  = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: .28 } } };
/* The hero does NOT fade. It is the first thing anyone sees, and starting it at
   zero opacity meant the page read as broken for about a second before it
   finished painting itself. It rises a little; it is never invisible. */
const heroIn  = { hidden: { opacity: 1, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: .22 } } };

export default function Home({ stats, onPlayDaily, onPlayGame, playedToday, progress, preLaunch, spoilerIds }) {
  const isNew = !stats.days;

  return (
    <motion.div className="home" initial="hidden" animate="show" variants={stagger}>

      <motion.section className="hero" variants={heroIn}>
        <SquiggleHero />
        <h1 className="herotitle">
          Eight ways to be <span className="hand wrong">wrong</span> about the world
        </h1>
        <p className="herolead">
          Sixteen questions a day. Draw it, sort it, scale it, spot it.
          About four minutes, no account, ever.
        </p>

        <button className="btn btn-primary btn-xl" onClick={onPlayDaily}>
          {playedToday ? "See today's result"
            : progress > 0 ? `Continue from ${progress} of ${SLOTS.length}`
            : "Play today's 16"}
        </button>
        {/* Honest about what this is before 20 Oct, rather than numbering a
            pre-launch set as if the game had already shipped. */}
        {preLaunch && (
          <p className="prelaunch">Preview — {BRAND.name} #1 lands 20 October</p>
        )}

        {/* New players see an invitation, not three zeroes. Nothing says "nobody
            plays this" like a row of empty stats on a first visit. */}
        {isNew ? (
          <p className="firstday">Day 1 — start your streak 🌱</p>
        ) : (
          <>
            <div className="herostats">
              <span><b>{stats.streak || 0}🔥</b>Streak</span>
              <span><b>{stats.best || 0}<i>/{SLOTS.length * 100}</i></b>Best score</span>
              <span><b>{stats.days}</b>Days played</span>
            </div>
            {/* Say it out loud. A streak that silently reads 0 looks like a bug to
                the person who knows they had five — naming the loss is both honest
                and the strongest reason to play today. */}
            {stats.streakLost && (
              <p className="streaklost">Streak lost 💔 — play today to start again.</p>
            )}
          </>
        )}
        <p className="nextin">Next set in <Countdown /></p>
      </motion.section>

      <AdSlot slot="home" />

      {/* HOW TO PLAY — three lines, above the fold, because a visitor who does not
          understand the game in one breath leaves. */}
      <motion.section className="card howto" variants={riseIn}>
        <h2 className="shead">How to play</h2>
        <ol className="howlist">
          <li><b>Guess.</b> Sixteen questions, eight different games. Nobody expects exact — close is the win.</li>
          <li><b>See the truth.</b> Every answer reveals the real number, the source it came from, and why it surprises people.</li>
          <li><b>Find your bias.</b> At the end you get your Fingerprint — the kind of wrong <i>you</i> are. Share it.</li>
        </ol>
      </motion.section>

      <motion.section className="card tryblock" variants={riseIn}>
        <h2 className="shead">Try one right now</h2>
        <TryOne onPlay={onPlayDaily} exclude={spoilerIds} />
      </motion.section>

      <motion.section variants={riseIn}>
        <h2 className="shead sechead">All eight games</h2>
        <div className="gamegrid">
          {GAME_LIST.map(g => (
            <button key={g.key} className="gcard" onClick={() => onPlayGame(g.key)}
                    style={{ '--gc': g.colour }}>
              <span className="giconwrap">{ICONS[g.key]({ c: g.colour })}</span>
              <span className="gname">{g.name}</span>
              <span className="grule">{g.rule}</span>
              <span className="gplay">Play 5</span>
            </button>
          ))}
        </div>
      </motion.section>

    </motion.div>
  );
}
