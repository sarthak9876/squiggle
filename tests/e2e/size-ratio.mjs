/* ACCEPTANCE 3 — the picture must agree with the number.

   Size It Up draws a RATIO. For a length question the drawn width ratio IS the
   number shown. For area it is the square root of it and for mass/volume the
   cube root, because drawing a car 21x wider than a person would claim it is
   21x LONGER — those carry a "(drawn by area)" / "(drawn by volume)" note.

   Two retests reported this broken. Both were measurement artefacts, and this
   test exists so the next one does not have to guess:

     1. An AREA question's stated ratio compared against its linear box. 27x
        drawn as sqrt(27) = 5.2x is correct and the note on screen says so.
     2. An exact box compared against a ROUNDED label. The readout shows two
        significant figures, so a true 2.753x prints as "2.8x" and a true 1.544x
        prints as "1.5x" — a 3% "error" that is entirely in the label.
     3. A reading taken mid-spring. The box animates; at 100ms it is nowhere.

   So: dimension-aware, settled, and the tolerance is the precision of the
   PRINTED number rather than a flat percentage.

     npm run build && npm run preview && node tests/e2e/size-ratio.mjs  */
import { chromium } from 'playwright-core';

const URL = process.env.URL || 'http://localhost:8788';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const CTA = '.qcard .actions .btn-primary, .qcard .btn-primary.grow';

/** The interval a printed number could have come from. "2.8" means [2.75, 2.85). */
const printedRange = text => {
  const m = String(text).match(/([\d.]+)/);
  if (!m) return null;
  const decimals = (m[1].split('.')[1] || '').length;
  const half = Math.pow(10, -decimals) / 2;
  return [parseFloat(m[1]) - half, parseFloat(m[1]) + half];
};

/* Practice RESUMES from localStorage (App.jsx startPractice), so seeding the
   queue is the only way to choose what gets measured. The walk this test used
   to do reloaded /game/size, which resumed the SAME five questions every time:
   90 iterations produced 4 distinct prompts and still printed "78/78 agree".
   Name the questions instead, and pick the ones that stress the drawing:

     z15  0.19x  the smaller box goes under the floor  (the bug this caught)
     z12   109x  the REFERENCE goes under the floor, camera fully zoomed out
     z9     28x  large but drawable
     z18    27x  area, so the box is sqrt(27) = 5.2x
     z19    21x  mass, so the box is cbrt(21) = 2.8x
     z1    2.3x  an ordinary mid-range length, the control                     */
const IDS = ['z15', 'z12', 'z9', 'z18', 'z19', 'z1'];

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(ids => localStorage.setItem('squiggle.v3', JSON.stringify({
  pid: 'e2e-size-ratio', practice: { size: { ids, answers: [], idx: 0 } },
})), IDS);

let failed = 0, checked = 0, structural = 0;
const byDim = {};
const seen = new Set();

await page.goto(`${URL}/game/size`, { waitUntil: 'networkidle' });

for (let q = 0; q < IDS.length; q++) {
  if (!(await page.$('input.slider'))) break;

  /* Drive it with real keys. Assigning input.value and firing a synthetic
     `input` leaves the CTA reading "Move the slider" forever: the component
     tracks `touched` in its own onKeyDown (size.jsx onKey), so an injected
     value never registers and every question silently failed to advance.
     Home and End land exactly on the ends of the per-question range, which is
     where a floor engages — so the sweep starts at the bug, not near it. */
  await page.focus('input.slider');
  for (const keys of [['Home'], ['PageUp'], ['PageUp', 'PageUp'], ['PageUp', 'PageUp'], ['End']]) {
    for (const k of keys) await page.keyboard.press(k);
    await page.waitForTimeout(700);                      // let the spring settle

    const r = await page.evaluate(() => ({
      ref: document.querySelector('.refbox')?.getBoundingClientRect().width,
      tgt: document.querySelector('.sizegrab')?.getBoundingClientRect().width,
      stated: document.querySelector('.readout b')?.textContent || '',
      note: document.querySelector('.dimnote')?.textContent || '',
      badge: document.querySelector('.zoombadge')?.textContent || '',
      prompt: (document.querySelector('.qprompt, h2')?.textContent || '').slice(0, 44),
    }));
    const range = printedRange(r.stated);
    if (!r.ref || !r.tgt || !range) continue;

    const dim = /area/.test(r.note) ? 'area' : /volume|weight/.test(r.note) ? 'volume' : 'length';
    const f = dim === 'area' ? Math.sqrt : dim === 'volume' ? Math.cbrt : (x => x);
    const [lo, hi] = range.map(f);
    const drawn = r.tgt / r.ref;
    /* A box is painted to whole device pixels, so a measured width carries up to
       half a pixel of error on each side. At ref=15px that is 3% of the ratio,
       which failed a true 9.5x by 0.05%. Compare the INTERVAL the two measured
       widths could have come from, not their quotient. */
    const drawnLo = (r.tgt - 0.5) / (r.ref + 0.5);
    const drawnHi = (r.tgt + 0.5) / Math.max(0.5, r.ref - 0.5);
    /* Past ~46x the stage cannot hold the pair at all and the game now SAYS so
       rather than drawing a ratio it is not drawing. A disclosed clamp is a
       pass; an undisclosed one is the bug. */
    const disclosed = /to scale/.test(r.badge);
    const ok = (drawnHi >= lo - 1e-9 && drawnLo <= hi + 1e-9) || disclosed;

    checked++;
    seen.add(r.prompt);
    (byDim[dim] ||= { n: 0, worst: 0, off: 0, slack: 0 }).n++;
    if (disclosed) { byDim[dim].off++; continue; }   // nothing to measure once it is off scale
    /* A sample whose quotient sits outside the band but whose sub-pixel
       interval still overlaps it. Worth counting: if this ever climbs, the
       boxes are drifting and the half-pixel allowance is hiding it. */
    if (drawn < lo || drawn > hi) byDim[dim].slack = (byDim[dim].slack || 0) + 1;
    /* Report the miss against the band the PASS/FAIL actually uses, not against
       the midpoint. A label printed as "1x" allows [0.5, 1.5], so a box 44% off
       that midpoint is dead inside spec — and a headline reading "worst 43.88%"
       sent a reader hunting a bug that was only ever the label's precision.
       100% here means exactly on the edge of what the printed number permits. */
    const mid = (lo + hi) / 2, half = (hi - lo) / 2;
    byDim[dim].worst = Math.max(byDim[dim].worst, Math.abs(drawn - mid) / half * 100);
    if (!ok) {
      failed++;
      console.log(`FAIL ${dim.padEnd(6)} ${r.prompt.padEnd(46)} shows "${r.stated}" -> box must be ${lo.toFixed(3)}..${hi.toFixed(3)}, drew ${drawn.toFixed(3)} (ref=${Math.round(r.ref)} tgt=${Math.round(r.tgt)})`);
    }
  }

  const cta = page.locator(CTA).first();
  if (!(await cta.isDisabled().catch(() => true))) await cta.click({ force: true }).catch(() => {});
  await page.waitForTimeout(600);
  const next = await page.$('.btn.btn-primary.wide');
  if (next) { await next.click(); await page.waitForTimeout(600); }
}

for (const [d, v] of Object.entries(byDim)) {
  console.log(`ok   ${d.padEnd(6)} ${String(v.n).padStart(2)} samples · worst ${v.worst.toFixed(2)}% of the allowed band · ${v.off} off-scale · ${v.slack} inside only on sub-pixel slack`);
}
console.log(`     ${seen.size}/${IDS.length} seeded questions reached`);

/* The sqrt/cbrt paths are the ones two retests reported, and the bank holds only
   3 area and 5 mass questions against ~34 length. A run that happens to deal no
   area question would still print "26/26 agree" — a green that proves nothing
   about the code under suspicion. Name the dimensions that must be exercised,
   so content dropping the last area question fails here instead of silently
   turning this file into a length-only test. */
/* The sqrt/cbrt paths are the ones two retests reported, and the bank holds only
   3 area and 5 mass questions against ~34 length. A run that reached no area
   question would still print "N/N agree" — a green that proves nothing about the
   code under suspicion. Fail instead, so content dropping the last area question
   shows up here rather than silently turning this into a length-only test. */
for (const d of ['length', 'area', 'volume']) {
  if (!byDim[d]) { structural++; console.log(`FAIL vacuous — no ${d} question was reached in ${checked} samples; this run proves nothing about the ${d} path`); }
}
if (seen.size < IDS.length) { structural++; console.log(`FAIL only ${seen.size} of ${IDS.length} seeded questions were reached — the queue did not advance`); }
console.log(`\n${checked - failed}/${checked} agree with their label`);
await browser.close();
console.log(failed || structural ? 'FAIL' : 'PASS');
process.exit(failed || structural ? 1 : 0);
