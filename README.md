# Squiggle

**Eight ways to be wrong about the world.**

A daily estimation game. Sixteen questions, eight game types, about four minutes.
No account, no backend, no data leaves the browser.

The point is not recall — it is the guess you make *before* you know. Every answer
reveals the real number and where it came from, and the run ends with a Bias
Fingerprint: not your score, but the *kind* of wrong you are.

## The eight games

| Game | What you do |
|---|---|
| Shapes Only | Four pictures, no labels. Pick one. |
| Size It Up | Scale one thing against another on a log slider. |
| Make The Sets | Nine things, three hidden sets. |
| Draw The Curve | Freehand real data onto blank axes. |
| Place The Dot | Drop a thing between two axes. |
| What Share? | Guess a percentage. No arithmetic. |
| Odd One Out | Spot it, then say *why* — the reason is worth as much. |
| Put In Order | Five cards, right sequence. Drag or tap to swap. |

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production bundle into dist/
npm run preview      # serve the production bundle
npm test             # unit + content tests
npm run lint:questions   # content checks — run before shipping questions
```

## How it is put together

- **React 18 + Vite.** No router, no state library, no UI kit. Five routes and a
  hand-rolled History API router cost fewer bytes than the dependency would.
- **Deterministic scheduling.** `src/lib/schedule.js` deals *every* player the
  same sixteen questions in the same order on a given day, seeded by a global
  salt plus the day number. It is a shared daily on purpose — a per-player
  shuffle was tried and removed, because it silently broke the one thing the
  share card promises: that your emoji grid is comparable with everyone else's.
  Guarantees: no repeat within a day, none across the cycle, one theme per day,
  and at least four India-relevant questions daily.
- **The mode contract.** `src/modes/contract.js`. Every game implements
  `init / ready / score / Component` and optionally `detail / signedError /
  numeric / clear`. Adding a ninth game means writing one file; the game screen
  never learns its name.
- **Content lives in `src/content/`.** One file per game. `npm run lint:questions`
  refuses a numeric claim with no source, an odd-one-out with two true reasons, a
  tied ordering, or a missing unit.
- **Everything local.** `localStorage` only, wrapped in try/catch because it
  throws in private windows.

## Renaming it

`src/brand.js` holds the name, tagline, domain, storage key and support address.
Nothing user-visible hardcodes them. Changing the name is one file and a rebuild.

## Ads

Off. `ADS` in `src/lib/flags.js` holds the whole policy: slots exist on home,
results and archive — never beside a question, because an ad next to a number you
are estimating changes the answer. Turning them on needs a live domain, a
publisher account, and an update to the footer privacy line, which currently
promises that nothing leaves the browser.

## Launch

`LAUNCH_DATE` in `src/lib/schedule.js` is the epoch for the public puzzle number:
launch day is #1. Before it, the game is playable and labelled "Preview".

## Licence

MIT — see `LICENSE`.

## Content cadence — how much writing keeps the game honest

Every mode is dealt **2 questions a day**, so a mode's runway is
`floor(global questions / 2)` days, and the cycle for the whole game is the
**minimum across all eight modes**. Region-tagged questions do not count — they
are filtered out of the daily pool.

### Write across ALL EIGHT modes, not into the thin ones

This is the counter-intuitive part, and it is measured, not assumed:

| what you write | cycle |
|---|---|
| nothing (today) | 16 days |
| +27 to Shapes Only alone | **16 days** — no change at all |
| +27 to Shapes Only *and* Size It Up | **16 days** — still none |
| +27 to all three of the thinnest modes | **17 days** — one day, for 81 questions |
| +2 to every one of the eight modes | 17 days |
| +27 to every one of the eight modes | 30 days |

"Prioritise the thinnest modes" is the natural plan and it is wrong. Taking
draw, Shapes Only and Size It Up to 60 buys exactly **one day**, because Odd One
Out (35) immediately becomes the binding constraint. The minimum moves only when
the mode currently holding it moves, and then the next-lowest takes over.

**Two global questions in EVERY mode — 16 questions — buys one day. A batch that
skips a mode buys nothing.**

| target | questions per mode | total bank | what it buys |
|---|---|---|---|
| 16 days | 33 (today) | 286 | the first repeat lands 5 Nov 2026 |
| 30 days | 60 | 480 | a month before anyone sees a question twice |
| 60 days | 120 | 960 | a quarter of comfortable headroom |

Reaching 30 days needs **194 more global questions**, weighted to the thin end:
draw +27, shadow +27, size +27, odd +25, groups +26, order +24, place +22,
share +16.

Pick a cadence from the date you want it by. Spread each batch across all
eight modes — a week spent entirely on one mode moves the cycle by zero days:

| finish by | weeks | per week | per day |
|---|---|---|---|
| 5 Nov 2026 (before the first repeat) | 2 | ~97 | ~14 |
| 30 Nov 2026 | 5 | ~39 | ~6 |
| 31 Dec 2026 | 10 | ~20 | ~3 |

### What a new question has to carry
Every one, no exceptions — these are the defect classes four retest rounds
were spent removing, and they all come back the moment a batch is written fast:

1. A real, checkable **source**. Not "general knowledge".
2. **Exactly one defensible answer.** "Which is oldest?" had two until the
   prompt said "oldest in India".
3. For Odd One Out, **every distractor false of EVERY item** — not merely false
   of the odd one. "The only one that tastes hot" was true of the chilli, so the
   question scored 0 for the player who knew it.
4. For Make The Sets, the label **true of all three items and of nothing in the
   other groups** ("Things with keys" held a passport).
5. **No picture already used by another question in the same day's set** — the
   scheduler now avoids this, and `lint:questions` reports what is left.
6. Run `npm run lint:questions` after every batch; it fails when fewer than
   7 days of runway remain.

### Gates that watch this
- `tests/runway.test.js` fails when the runway drops to 7 days or less.
- `lint:questions` fails on the same threshold and prints the gap every run.
- `MIN_DAYS` in the linter is a ratchet: the cycle may never shrink.
