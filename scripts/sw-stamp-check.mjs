/* Does the service worker's cache name actually track the code?

   The cache name was the hardcoded string 'squiggle-v2.0.0'. sw.js's activate
   handler deletes every cache that is NOT the current name, so a name that
   never changes means old caches are never purged and a deploy rides entirely
   on the navigation request being network-first. One forgotten manual bump and
   launch-day fixes sit behind a stale cache.

   Two halves, and BOTH matter:
     changes  — a real code change must move the stamp, or nothing is purged
     stable   — an unchanged build must NOT move it, or every deploy evicts
                every returning player's cache for no reason

   The first probe for this was bad: it appended a COMMENT to a source file,
   which esbuild strips, so the stamp correctly did not move and the check
   "passed" while proving nothing. The mutation has to survive minification, so
   this one changes a string literal that is rendered.

     node scripts/sw-stamp-check.mjs
*/
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const stamp = () => {
  execSync('npx vite build', { stdio: 'pipe' });
  const m = readFileSync('dist/sw.js', 'utf8').match(/const VERSION = '([^']+)'/);
  if (!m) throw new Error('no VERSION in dist/sw.js — the stamp plugin did not run');
  if (m[1].includes('__BUILD__')) throw new Error('VERSION still holds the raw token: ' + m[1]);
  return m[1];
};

const FILE = 'src/brand.js';
const original = readFileSync(FILE, 'utf8');
let failed = false;
const say = (ok, msg) => { if (!ok) failed = true; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };

try {
  const a = stamp();
  const b = stamp();
  say(a === b, `an unchanged rebuild keeps the stamp (${a} -> ${b})`);

  // A rendered string literal. Survives minification; a comment would not.
  writeFileSync(FILE, original.replace("tagline: '", "tagline: 'x"));
  const c = stamp();
  say(c !== a, `a code change moves the stamp (${a} -> ${c})`);
} finally {
  writeFileSync(FILE, original);
  execSync('npx vite build', { stdio: 'pipe' });   // leave dist/ matching the tree
}

console.log(failed ? '\nFAIL' : '\nPASS');
process.exit(failed ? 1 : 0);
