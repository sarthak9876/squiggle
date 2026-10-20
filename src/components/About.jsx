import { motion } from 'framer-motion';
import { BRAND } from '../brand.js';
import { REPORT_TO } from '../lib/report.js';
import { ADS } from '../lib/flags.js';

/* Single source of truth for who made this and where to find them. */
/* ONE place to put the real URLs once the accounts exist. Anything left null is
   not rendered anywhere — footer or About. */
export const HANDLES = {
  instagram: null,   // e.g. 'https://instagram.com/squiggle.game'
  x:         null,
  discord:   null,
  coffee:    null,   // e.g. 'https://buymeacoffee.com/sarthak'
};

export const CREDITS = {
  author: 'Sarthak',
  authorUrl: null,
  socials: [
    /* A link to instagram.com/ is not a link to Squiggle — it looks live and goes
       nowhere, which is worse than no link. Fill in the handle and the row appears;
       leave it null and the row is hidden. */
    { label: 'Instagram', emo: '📸', url: HANDLES.instagram },
    { label: 'X',         emo: '𝕏',  url: HANDLES.x },
    { label: 'Discord',   emo: '💬', url: HANDLES.discord },
    { label: 'Buy me a coffee', emo: '☕', url: HANDLES.coffee, accent: true },
  ].filter(s => !!s.url),
};

export default function About({ onHome }) {
  return (
    <motion.div className="aboutpage" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="card">
        <h2 className="shead">About {BRAND.name}</h2>
        <p className="abouttext">
          {BRAND.name} is a daily game about how badly we all estimate the world. Eight
          ways to be wrong, sixteen questions, about four minutes. Free, no account,
          {/* Read from the same flag the Privacy page reads. This said "no ads on
              the questions themselves" while Privacy said "Ads: None" — which
              told a reader there are ads somewhere, and left two sentences to
              keep in step by hand the day ads do go on. */}
          {ADS.enabled ? ' and no ads beside a question.' : ' no ads.'}
        </p>
        <p className="abouttext">
          Every answer shows you the real number, where it came from, and why it
          surprises people. At the end you get your <b>Bias Fingerprint</b> — not a
          score, but the kind of wrong you personally are.
        </p>
        <p className="abouttext">
          Built by {CREDITS.authorUrl
              ? <a href={CREDITS.authorUrl} target="_blank" rel="noopener noreferrer">{CREDITS.author}</a>
              /* An <a> with no href looked clickable and did nothing. */
              : <b>{CREDITS.author}</b>},
          in the daily-puzzle tradition that Wordle and <a href="https://magnitudle.com"
          target="_blank" rel="noopener">Magnitudle</a> made popular.
        </p>
        <div className="socials">
          {CREDITS.socials.map(x => (
            <a key={x.label} className="slink" href={x.url} target="_blank" rel="noopener"
               style={x.accent ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}>
              {x.emo} {x.label}
            </a>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="shead">Where the questions come from</h2>
        <p className="abouttext">
          Every question that states a number cites where the number came from —
          NASA, the World Bank, UNESCO, peer-reviewed papers. The word puzzles
          state no numbers, so they cite nothing. Figures are rounded to teach a
          shape, not to be quoted in an exam.
          Found something wrong? There is a report link under every answer, or email <a href={'mailto:' + REPORT_TO}>{REPORT_TO}</a> — it gets fixed or deleted.
        </p>
        <p className="credit">
          Emoji artwork is <a href="https://github.com/jdecked/twemoji" target="_blank" rel="noopener noreferrer">Twemoji</a>,
          © Twitter, licensed <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC-BY 4.0</a>.
          Served from this site, so the pictures look the same on every device and
          nothing about you reaches a third party.
        </p>
      </div>

      <div className="actions">
        <button className="btn btn-ghost grow" onClick={onHome}>← Home</button>
      </div>
    </motion.div>
  );
}
