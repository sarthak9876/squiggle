/* Play a full day in a real browser, every mode, and fail on anything a unit
   test cannot see: a question that will not accept an answer, a dead button, a
   console error, a run that never reaches /results.

   This exists because the unit suite is green on bugs that make the game
   unplayable. The Draw The Curve dead-Submit bug (a focus-driven layout shift
   that moved the button between mousedown and mouseup) passed 174 unit tests and
   logged nothing to the console; only a real click found it.

     npm run build && npm run preview     # serve dist/ on 8788
     npm run test:e2e                     # desktop
     VIEW=phone npm run test:e2e          # 390px
     THEME=dark npm run test:e2e          # dark palette
     npm run test:e2e:all                 # all four combinations

   Uses the system Chrome via playwright-core, so there is no browser download.  */
import { chromium } from 'playwright-core';

const URL  = process.env.URL || 'http://localhost:8788/';
const VIEW = process.env.VIEW === 'phone'
  ? { width: 390, height: 844 } : { width: 1280, height: 900 };
/* Dark mode was never played end to end. The whole palette swaps — every token
   is redefined under prefers-color-scheme — so a contrast or visibility bug
   there is invisible to a light-mode run and to the unit suite. */
const SCHEME = process.env.THEME === 'dark' ? 'dark' : 'light';
const QUESTIONS = 16;

/* The submit button, matched by its ROLE in the action bar rather than one class
   name — an earlier version keyed on `.cta` alone, which silently matched
   nothing and reported every question as stuck. */
const CTA  = '.qcard .actions .btn-primary, .qcard .btn-primary.grow';
const NEXT = '.btn.btn-primary.wide';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext({ viewport: VIEW, colorScheme: SCHEME })).newPage();

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));

const ready = async () => {
  const c = page.locator(CTA).first();
  return (await c.count()) ? !(await c.isDisabled().catch(() => true)) : false;
};

/** Do whatever this mode needs to make Submit live. */
async function engage() {
  const tried = [];

  // Sliders. Deliberately NOT the midpoint: Size It Up once scored 43 of 44
  // questions correct for dragging to the centre, and a midpoint-happy driver
  // would never have noticed.
  for (const r of await page.locator('.stage input[type=range]').all()) {
    const max = Number(await r.getAttribute('max') ?? 100);
    const min = Number(await r.getAttribute('min') ?? 0);
    const v = Math.round(min + (max - min) * 0.72);
    await r.evaluate((el, val) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(val));
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, v);
    tried.push(`range=${v}`);
  }
  if (await ready()) return tried.join(',');

  // Tiles. RE-COUNT every pass: picking an item in Odd One Out reveals the
  // reason buttons, so a count taken once sees half the controls.
  const sel = '.stage button, .stage [role=button], .stage li, .stage .tile, .stage .opt';
  for (let pass = 0; pass < 3; pass++) {
    const n = Math.min(await page.locator(sel).count(), 30);
    for (let i = 0; i < n; i++) {
      const t = page.locator(sel).nth(i);
      if (!(await t.isVisible().catch(() => false))) continue;
      await t.click({ timeout: 2000 }).catch(() => {});
      if (await ready()) { tried.push(`tiles(${pass},${i})`); return tried.join(','); }
    }
  }

  // Canvas: drag a curve, then a single click for the drop-a-dot modes.
  for (const s of ['.stage canvas', '.stage svg']) {
    const box = await page.locator(s).first().boundingBox().catch(() => null);
    if (!box) continue;
    await page.mouse.move(box.x + box.width * 0.06, box.y + box.height * 0.75);
    await page.mouse.down();
    for (let k = 1; k <= 30; k++)
      await page.mouse.move(box.x + box.width * (0.06 + 0.88 * k / 30),
                            box.y + box.height * (0.75 - 0.5 * k / 30));
    await page.mouse.up();
    tried.push(`drag:${s}`);
    if (await ready()) return tried.join(',');
    await page.mouse.click(box.x + box.width * 0.62, box.y + box.height * 0.38);
    tried.push(`click:${s}`);
    if (await ready()) return tried.join(',');
  }
  return tried.join(',') || 'nothing';
}

await page.goto(URL, { waitUntil: 'networkidle' });
const start = page.locator('a,button').filter({ hasText: /^(Play|Start|Play today|Begin)/i }).first();
if (await start.count()) await start.click();
else await page.goto(URL.replace(/\/$/, '') + '/play', { waitUntil: 'networkidle' });

const rows = [];
let stuck = null;
for (let q = 1; q <= QUESTIONS; q++) {
  await page.waitForSelector('.qcard', { timeout: 15000 });
  const count = (await page.locator('.qcount').first().textContent().catch(() => '')) || '';
  const mode  = (await page.locator('.gtag').first().textContent().catch(() => '')) || '';

  /* Artwork must actually RENDER. The suite used to assert only that a question
     was ANSWERABLE, so when a bad CSS length collapsed every Size It Up
     silhouette to zero width the run still passed 16/16 — the slider works
     whether or not you can see what you are sizing. A picture that is 0px is a
     broken question, not a styling nit. */
  const blank = await page.evaluate(() => {
    const art = [...document.querySelectorAll('.stage img, .stage .sil, .stage canvas, .stage svg')];
    return art.filter(e => { const r = e.getBoundingClientRect(); return r.width < 8 || r.height < 8; }).length;
  });
  if (blank) { stuck = `q${q} (${mode.trim()}) rendered ${blank} piece(s) of artwork at zero size`; break; }

  const did = await engage();
  const ok  = await ready();
  rows.push({ q, count: count.trim(), mode: mode.trim(), ok, did });
  if (!ok) { stuck = `q${q} (${mode.trim()}) never became answerable after ${did}`; break; }

  // Click Submit with a REAL mouse. Enter would have hidden the dead-click bug,
  // because the keyboard path bypasses hit-testing entirely.
  await page.locator(CTA).first().click();

  const next = page.locator(NEXT).first();
  try {
    await next.waitFor({ state: 'visible', timeout: 12000 });
  } catch {
    stuck = `q${q} (${mode.trim()}) submitted but never revealed — the Submit click did nothing`;
    break;
  }
  await next.click();
  await page.waitForTimeout(500);

  const half = page.locator('.halfcard button');
  if (await half.count()) { await half.click(); await page.waitForTimeout(320); }
}

await page.waitForTimeout(1000);
const reached = /result/i.test(page.url());
/* The fingerprint TITLE is painted into the share-card canvas, so the only
   fingerprint text in the DOM is the tag row. Assert on what is actually there
   rather than on a selector that silently matches nothing. */
const tags = (await page.locator('.fpcard .fptags .tag').allTextContents()).join(' · ');
const cardDrawn = await page.locator('.fpcard .cardpreview canvas, .fpcard .cardpreview img').count();
const hscroll = await page.evaluate(() =>
  document.documentElement.scrollWidth > document.documentElement.clientWidth);

for (const r of rows)
  console.log(`${r.ok ? 'ok  ' : 'STUCK'} ${r.count.padEnd(17)} ${r.mode.padEnd(15)} ${r.did}`);

const answered = rows.filter(r => r.ok).length;
console.log(`\nanswered        ${answered}/${QUESTIONS}`);
console.log(`reached results ${reached}`);
console.log(`fingerprint     ${tags || '(no tags)'}`);
console.log(`share card      ${cardDrawn ? 'rendered' : 'MISSING'}`);
console.log(`h-scroll        ${hscroll ? 'YES — layout overflows' : 'none'}`);
console.log(`console errors  ${errors.length}`);
for (const e of errors.slice(0, 10)) console.log('  ! ' + e);

await browser.close();

const fail = stuck || (answered !== QUESTIONS && 'did not answer every question')
  || (!reached && 'never reached the results screen')
  || (!tags && 'the results screen showed no fingerprint tags')
  || (!cardDrawn && 'the share card never rendered')
  || (hscroll && 'horizontal scroll')
  || (errors.length && `${errors.length} console error(s)`);
if (fail) { console.error(`\nFAIL: ${fail}`); process.exit(1); }
console.log('\nPASS');
