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
npm test             # 115 tests
npm run lint:questions   # content checks — fails CI on a bad question
```

## How it is put together

- **React 18 + Vite.** No router, no state library, no UI kit. Five routes and a
  hand-rolled History API router cost fewer bytes than the dependency would.
- **Deterministic scheduling.** `src/lib/schedule.js` deals every player the same
  slots in the same order, but which *question* lands in each slot is seeded by a
  local player id — so scores are comparable and there is no answer key to leak.
  Guarantees: no repeat within a day, none across a 17-day cycle, one theme per
  day, and at least four India-relevant questions daily.
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
