# Content audit

Every item a playtest or the validator found, with what was wrong and what was
done. Structural checks live in `src/lib/validate.js` and run in CI through
`tests/validate.test.js`; the rest is judgement and is recorded here.

The validator checks STRUCTURE, never truth. "Is this sentence also true of the
outlier?" is semantic and no linter settles it — which is exactly how the worst
item below shipped.

## Fixed

| id | mode | issue | fix |
|---|---|---|---|
| `d7` | odd | **Every distractor was true of a different item** — "the only gas giant" of Jupiter, "hotter than 400°C" of Venus, "visible ice caps" of Mars. A player who chose Jupiter + "the only gas giant", both correct, **scored 0**. `trueCount:1` was a false attestation. | Three distractors replaced with statements false of all four items (three ARE named after Roman gods; all four have been reached by spacecraft; all four are visible unaided). |
| `d8` | odd | "The only one not compiled" is defensible for HTML, which is the answer — a second true reason. | → "the only one maintained by a standards body", false because C++ is ISO-standardised. |
| `d33` | odd | "The only one with the world's tallest building" is true of Dubai. The inline comment admitted it was unsure. | → "the only one with a stock exchange", false of all four. |
| `o15` | order | Candle flame 1,000 °C vs lava 1,100 °C — 9% apart, and contested: candles peak near 1,400, lava runs 700–1,200. | Candle → oven at full heat (250 °C). |
| `o11`, `o35` | order | Three near-identical "Hottest first" questions; `o35` listed lava at 1,200 where `o15` says 1,100, so the bank taught two numbers for one fact. | Both removed; `o15` kept for the lightning bolt. |
| `in-dr7` | draw | "Indians online" twice — once as a share, once as an absolute count in millions. | Removed; the share version survives because a stranger can estimate it. |
| `z28` | size | Prompt said "a TREE", answer was a mature oak. Trees run 4 m–100 m. | Prompt names the oak. Its note also wandered to Hyperion, a redwood. |
| `h-tree` | shadow | Tile said "Tree"; note said "a large oak". | Note matches the tile. |
| `z8` | size | A LENGTH question answered with "roughly eight bicycles park in one car's space" — parking is width and area. | Removed the parking claim. |
| `z24` | size | "The road space one bus occupies" conflated length with area. | → "12 m of bus against 1.8 m of bicycle". |
| `in-p5` | place | Taj Mahal drawn with U+1F54C **MOSQUE**. It is a mausoleum. | → U+1F3DB, matching `emoji.js`. All 12 escaped emoji in the file were decoded; this was the only mismatch. |
| `g5` | groups | "Hoe" as a garden tool — global-English slang, the same class as the "Swinger" result name that had to be pulled. | → "Trowel". The puzzle's traps are Spade and Heart; the third tool carried nothing. |
| `d21` | odd | "Rubies form around organic carbon traces" is invented geology, and the stated reason was true of Diamond AND Ruby. | Fixed the REASON, not the items — Ruby is what keeps "only transparent" and "only hard" false. |
| `o28` | order | "Russia is larger than Pluto" — true until New Horizons measured Pluto at 1188.3 km (17.74M km² vs Russia's 17.10M). | Sentence dropped. |
| `o6` | order | "Minecraft is now older than Pac-Man was when Minecraft came out" — 15 years against 31. Not true until 2042. | Stated the way round that is true. |
| `h6` | shadow | Note claimed "about seventy years" then gave two dates 21 years apart. | Both figures now appear; seventy is the gap from the 1817 running machine. |
| `h1` | shadow | Cited the Greenland-shark ageing paper for a question about tortoise lifespans. | → AnAge database. |
| `s18` | share | Answered 5%; Spotify's own Loud & Clear says 2.3%; the note's figures implied 0.6%. | **Removed** — the true answer sits at the slider rail, which `tests/scorers.test.js:141` forbids. The fact belongs in Put In Order. |
| bias | — | "The Doom Optimist" contradicted its own blurb. | → "The Doomsayer". |

## Known, not yet fixed

| what | count | why it is still here |
|---|---|---|
| Ordered values under 15% apart | 27 | Each is a coin flip rather than a question. Ratcheted in `tests/validate.test.js` so the number can fall but never rise. Fixing them means re-picking items with real gaps, one question at a time. |
| Questions tagged `region:'india'` | 86 | 23.8% of the bank. No longer forced into a day — the cap is 1 per region per day — but there is still only ONE region value in the bank, so "rotate regions" needs packs that do not exist yet. |
| US-only questions carrying no region tag | ~11 (draw) | The US has India's share of DRAW with none of its accountability. Tagging them makes the per-day cap apply to them too. |
| `s11` GSMA smartphone share, `p20` South Korea internet | 2 | Reported as wrong by an audit. **Not re-derived by me, and therefore not edited.** A review report is a list of leads. |
| Notes that restate the answer | unknown | e.g. "Under three cars — about 12 m". Every note should add something the question did not. |
| Groups word puzzles with `source:null` | 19 | Verified as correct: they make no factual claim to source. Not a gap. |

## Rules for new questions

1. Odd One Out: every distractor must be **false of every item**, including the
   answer. If a distractor is true of any item, the puzzle has two right answers.
2. Ordered items need a gap a person can feel — under 15% is a toss-up.
3. The note explains the tile that is on screen. If the note says "a large oak",
   the option may not say "Tree".
4. A number and its unit must survive being read aloud by someone who has never
   been to the country it came from.
