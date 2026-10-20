/* Does a deploy actually reach a player who already has the site cached?

   The unit-level half is scripts/sw-stamp-check.mjs: a code change moves the
   cache name, an unchanged rebuild does not. That proves the NAME is right. It
   says nothing about whether a returning browser notices.

   So this drives a real upgrade: serve build A, let the service worker install
   and take control, swap dist/ to build B, reload, and wait for the toast. If
   the toast never appears, a player with the old bundle keeps it until they
   clear site data — which on launch day is every bug fix sitting behind a cache.

     npm run build && node tests/e2e/sw-update.mjs
*/
import { chromium } from 'playwright-core';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, cpSync, rmSync, mkdtempSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, extname, resolve } from 'node:path';

const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
                '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png',
                '.woff2':'font/woff2', '.webmanifest':'application/manifest+json' };

/* A plain static server, not `vite preview`: the swap has to happen between two
   page loads, and serving from a directory we control is the only way to do it
   without a second port and a second origin — a service worker is scoped to its
   origin, so a different port is a different, uncontrolled browser. */
let ROOT = 'dist';
const server = createServer((req, res) => {
  const url = req.url.split('?')[0];
  let file = join(ROOT, url === '/' ? 'index.html' : url);
  /* Confine every read to ROOT. The path comes off the wire, so `/../../.ssh/id_rsa`
     would otherwise resolve straight out of the served directory — the fact that
     only Playwright is meant to call this is not a control, it is a hope. */
  if (!resolve(file).startsWith(resolve(ROOT))) { res.writeHead(403).end(); return; }
  let body;
  try { body = readFileSync(file); }
  catch { file = join(ROOT, 'index.html'); body = readFileSync(file); }   // SPA fallback
  res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-cache');   // let the SW, not the HTTP cache, decide
  res.end(body);
});
// Loopback only. The default binds every interface, which puts a file server on
// the laptop's address on whatever network it is joined to.
await new Promise(r => server.listen(8799, '127.0.0.1', r));

const FILE = 'src/brand.js';
const original = readFileSync(FILE, 'utf8');
let failed = false;
const say = (ok, m) => { if (!ok) failed = true; console.log((ok ? 'ok   ' : 'FAIL ') + m); };

let dirA, dirB;
const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext()).newPage();

try {
  /* mkdtemp, not a fixed /tmp/sw-a: a predictable path in a world-writable
     directory can be pre-created as a symlink, and cpSync would follow it. */
  dirA = mkdtempSync(join(tmpdir(), 'squiggle-sw-a-'));
  cpSync('dist', dirA, { recursive: true });
  const verA = readFileSync('dist/sw.js', 'utf8').match(/const VERSION = '([^']+)'/)[1];

  ROOT = dirA;
  await page.goto('http://localhost:8799/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => navigator.serviceWorker.controller != null, { timeout: 20000 })
    .then(() => say(true, 'build A installed and took control'))
    // The first load registers but does not control; one reload hands over.
    .catch(async () => {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForFunction(() => navigator.serviceWorker.controller != null, { timeout: 20000 });
      say(true, 'build A took control after one reload');
    });

  const cachedA = await page.evaluate(async () => (await caches.keys()));
  say(cachedA.length > 0, `build A populated a cache: ${cachedA.join(', ')}`);

  // Build B: a change that survives minification.
  writeFileSync(FILE, original.replace("tagline: '", "tagline: 'x"));
  execSync('npx vite build', { stdio: 'pipe' });
  const verB = readFileSync('dist/sw.js', 'utf8').match(/const VERSION = '([^']+)'/)[1];
  say(verB !== verA, `build B has a different cache name (${verA} -> ${verB})`);

  dirB = mkdtempSync(join(tmpdir(), 'squiggle-sw-b-'));
  cpSync('dist', dirB, { recursive: true });
  ROOT = dirB;

  await page.reload({ waitUntil: 'networkidle' });
  const toast = await page.waitForSelector('.swtoast', { timeout: 25000 }).catch(() => null);
  say(!!toast, 'the "new version is ready" toast appeared for a returning player');

  if (toast) {
    const text = await toast.textContent();
    say(/new version/i.test(text), `toast says: "${text.trim()}"`);
    const role = await toast.getAttribute('role');
    say(role === 'status', `toast is announced (role="${role}")`);
    await page.click('.swtoast button');
    await page.waitForLoadState('networkidle');
    // After the reload the OLD cache must be gone, or nothing was purged.
    const keys = await page.evaluate(() => caches.keys());
    say(!keys.includes(verA), `the old cache was purged (now: ${keys.join(', ') || 'none'})`);
  }
} finally {
  writeFileSync(FILE, original);
  execSync('npx vite build', { stdio: 'pipe' });
  await browser.close();
  server.close();
  for (const d of [dirA, dirB]) if (d) rmSync(d, { recursive: true, force: true });
}

console.log(failed ? '\nFAIL' : '\nPASS');
process.exit(failed ? 1 : 0);
