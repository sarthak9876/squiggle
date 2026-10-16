/* Fetch the repo's star count AT BUILD TIME and write it into a module.

   Deliberately not a runtime fetch. A client-side call to api.github.com would
   send every visitor's IP address to GitHub on every page load — the same
   third-party leak that made the footer's "no data leaves your browser" false
   when the fonts came from Google. The count is as fresh as the last deploy,
   which for a number that changes a few times a week is fine.

   A failed fetch (offline build, rate limit, repo renamed) is NOT fatal: it
   keeps whatever value is already committed, so a bad network never ships a
   zero or breaks the build. */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const REPO = 'sarthak9876/squiggle';
const OUT = new URL('../src/lib/repo-stats.js', import.meta.url);

function previous() {
  try {
    const m = readFileSync(OUT, 'utf8').match(/stars:\s*(\d+)/);
    return m ? Number(m[1]) : null;
  } catch { return null; }
}

const write = (stars, note) => {
  writeFileSync(OUT, `/* GENERATED at build time by scripts/fetch-stars.mjs — do not edit.
   ${note} */
export const REPO_STATS = {
  slug: '${REPO}',
  url: 'https://github.com/${REPO}',
  stars: ${stars === null ? 'null' : stars},
};
`);
  console.log(`repo-stats: ${REPO} → ${stars === null ? 'unknown' : stars + ' stars'} (${note})`);
};

try {
  const res = await fetch(`https://api.github.com/repos/${REPO}`, {
    headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'squiggle-build' },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  write(data.stargazers_count ?? null, `fetched ${new Date().toISOString().slice(0, 10)}`);
} catch (err) {
  const keep = previous();
  write(keep, `fetch failed (${err.message}) — kept last known value`);
}
