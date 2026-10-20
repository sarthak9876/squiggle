import { REPO_STATS } from '../lib/repo-stats.js';
import { BRAND } from '../brand.js';

/* The GitHub mark, official path data. Linking to a repo is exactly what it is
   for, and an inline SVG means no extra request and it inherits currentColor so
   it works in both themes without a second asset. */
function GitHubMark({ size = 18 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
        0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01
        1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95
        0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27
        2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82
        1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01
        2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/* Star counts are shown the way GitHub itself shows them: 1.2k, not 1247. */
const short = n =>
  n >= 10000 ? Math.round(n / 1000) + 'k'
  : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  : String(n);

export default function RepoLink() {
  const { url, stars } = REPO_STATS;
  /* The count is baked in at build time (scripts/fetch-stars.mjs) rather than
     fetched here — a client-side call to api.github.com would hand every
     visitor's IP to GitHub and make the footer's privacy line false.
     null means the build could not reach GitHub; show the icon, drop the count,
     rather than print a wrong zero. */
  return (
    <a className="repolink" href={url} target="_blank" rel="noopener noreferrer"
       aria-label={!stars
         ? `${BRAND.name} on GitHub — source code`
         : `${BRAND.name} on GitHub — ${stars} ${stars === 1 ? 'star' : 'stars'}`}
       title="Source on GitHub">
      <GitHubMark />
      {/* `null` means the build could not reach GitHub. ZERO means it reached it
          and the honest answer is nobody has starred this yet — which on a launch
          page is a worse signal than showing nothing. Both hide the count. */}
      {stars > 0 && (
        <span className="repostars">
          <span className="star" aria-hidden="true">★</span>{short(stars)}
        </span>
      )}
    </a>
  );
}
