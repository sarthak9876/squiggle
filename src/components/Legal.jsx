import { motion } from 'framer-motion';
import { BRAND } from '../brand.js';
import { REPORT_TO } from '../lib/report.js';
import { CROWD_ENABLED } from '../lib/flags.js';
import { ADS } from '../lib/flags.js';

/* Privacy and terms.

   Written to be TRUE rather than to be long. The footer promises "no tracking,
   no data leaves your browser", and that promise only became true this round —
   the fonts used to load from Google, which sent every visitor's IP there. If
   crowd data or ads are ever switched on, the flags below flip these sentences
   with them, so the page cannot drift out of date silently. */

export function Privacy({ onHome }) {
  return (
    <motion.div className="legal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="card">
        <h2>Privacy</h2>
        <p className="legalupd">Short version: {BRAND.name} keeps everything on your device.</p>

        <h3>What is stored, and where</h3>
        <p>
          Your scores, streak, answers and settings live in your browser’s
          <code> localStorage</code>, under the key <code>{BRAND.storageKey}</code>. They never
          leave your device. Clearing your browser data deletes them permanently —
          there is no account and no copy on a server to restore from.
        </p>

        <h3>What is sent anywhere</h3>
        <p>
          {CROWD_ENABLED
            ? 'Anonymous aggregate answer data is sent so the crowd comparison can work. It contains no identifier.'
            : 'Nothing. There is no analytics script, no tracking pixel, no cookie, and no account. The fonts are served from this site rather than from Google, so not even your IP address is shared with a third party.'}
        </p>

        <h3>Sharing and challenge links</h3>
        <p>
          When you share a result, your device creates the text or image and hands it
          to whichever app you choose — {BRAND.name} is not involved after that. A
          challenge link contains only the day number, the score to beat and the name
          you typed. Leave the name blank and it contains nothing about you.
        </p>

        <h3>Ads</h3>
        <p>
          {ADS.enabled
            ? 'This site shows ads, which are served by a third party that may set cookies. They never appear beside a question.'
            : 'None. If that ever changes, this page and the footer change with it.'}
        </p>

        <h3>Age</h3>
        <p>
          Made for 13 and over. {BRAND.name} does not ask for a name, an email or an
          age, and collects nothing that could identify a child — or anyone else.
        </p>

        {/* Named two regimes and stopped. The players are 16-45 worldwide, so a
            list that reads "India and the EU" tells everyone else their law was
            not considered — and the list can never be complete anyway. State the
            right itself, which every one of those laws grants, and then the one
            fact that settles it everywhere: there is nothing to hand over. */}
        <h3>Your rights</h3>
        <p>
          Wherever you live, data protection law gives you the right to ask what a
          site holds about you, to get a copy, and to have it deleted — the GDPR in
          Europe and the UK, the LGPD in Brazil, the DPDP Act in India, the CCPA
          in California, and their equivalents elsewhere. Here the answer to all three is the same:
          nothing is held. There is no server and no account. Everything is in this
          browser, and clearing site data for {BRAND.domain} erases all of it in one
          step, with nothing to ask us for. Questions: <a href={`mailto:${REPORT_TO}`}>{REPORT_TO}</a>.
        </p>
        <button className="btn btn-ghost wide" onClick={onHome}>← Home</button>
      </div>
    </motion.div>
  );
}

export function Terms({ onHome }) {
  return (
    <motion.div className="legal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="card">
        <h2>Terms</h2>
        <p className="legalupd">Short version: it’s a free game. Play it, share it, don’t resell it.</p>

        <h3>Using {BRAND.name}</h3>
        <p>
          Free, no account, no warranty. It is a game about estimation — the answers
          are rounded to teach a shape and are not a source to quote. Every question
          that states a number cites where that number came from; if one is wrong,
          there is a report link under every answer.
        </p>

        <h3>The code</h3>
        <p>
          The source is MIT licensed. The question bank is yours to learn from, not to
          republish as your own product.
        </p>

        <h3>Support</h3>
        <p>
          Any support given is a gift, not a purchase. It buys no feature, no
          advantage and no refund.
        </p>

        <h3>Liability</h3>
        <p>
          Provided “as is”. If a question is wrong, tell us and it gets fixed or
          deleted — that is the whole remedy on offer.
        </p>
        <button className="btn btn-ghost wide" onClick={onHome}>← Home</button>
      </div>
    </motion.div>
  );
}
