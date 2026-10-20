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

## Round 2 — external retest, 2026-10-21

Every item the retest raised under P0.2, and what changed. The shared defect in
the Odd One Out set was not wrong facts but distractors that are TECHNICALLY
false while READING as true — which punishes the player who knows the most.

| id | was | now | why |
|---|---|---|---|
| `o30` | Krakatoa at **310 dB** | Rocket 180 > **Krakatoa at 160 km 172** | 310 dB cannot exist in air: above ~194 dB the wave's low-pressure half would have to go below a vacuum. 172 dB at 160 km is the real measurement and the better fact. Order changed, so the rocket now leads. |
| `o17` | Great Wall 21,196 · UK coastline 12,429 | Trans-Siberian · Nile · Route 66 · Great Barrier Reef · Panama Canal | Both dropped figures depend on who measured. The coastline paradox gives 12,429 to ~31,000 km for the UK; the Wall is 21,196 km with every branch or ~8,850 for the main wall. A question scored on ORDER cannot rest on either. |
| `d33` | Nairobi: "only one in Asia", "only one with a metro" | three plainly false claims | Every distractor was the true reason with one word flipped. Nairobi is the only one NOT in Asia and the only one WITHOUT a metro, so the question tested reading speed, not knowledge. |
| `d14` | "only one with no land border" | "only one with glaciers" | Since the 2022 Hans Island settlement Greenland has a land border with Canada, which made "no land border" true of Australia too — two scoring reasons, one score. |
| `d14` | "only one with a desert" | "only one with an active volcano" | False only because Greenland is a polar desert, which almost nobody counts. |
| `d18` | "only one in the northern hemisphere" | "only one deeper than 5,000 metres" | The Mediterranean IS the only one lying entirely north of the equator. Defensible as true. |
| `d19` | "only one that is regulated" · "only one you can spend in shops" | "only one with a fixed supply" · "only one that runs on a blockchain" | The first is a judgement, not a fact. The second reads as plainly true of Visa. |
| `d25` | "not a nut botanically" · "causes allergies" | "pressed for cooking oil" · "grown in the United States" | Almonds and cashews are drupe seeds, so the first is false on a technicality while reading true. Tree-nut allergies are as real as peanut. |
| `d31` | "the only one you hit" | "the only one found in an orchestra" | A piano is struck too. |
| `h12` | cat / chicken / rabbit / **dog** | mouse / chicken / rabbit / **dog** | A chihuahua is under 3 kg and a Maine Coon reaches 11, so the answer depended on which dog you pictured. |
| `h45` | "Which of these is **coldest**?" | "...coldest **at night**?" | The Moon's day side reaches +127 C, hotter than anywhere on Earth. The question now asks what the answer measures. |
| `s24` | "What share of your **DNA**..." | "What share of your **genes** have a recognisable counterpart..." | Prompt and note answered different questions, and the "50% of your DNA" version is itself the myth. |
| `dr` genome | note cited "the dotted line" | "...which biologists had expected it to follow" | No dotted line was ever drawn. |
| `z36` | blue whale vs a **cricket pitch** | removed | Duplicated z1's subject, a 1.5x ratio made a weak question, and the ruler only works if you already know how long a cricket pitch is. |

### The region packs
74 questions tagged `region:'india'` are filtered out of `POOLS` entirely, which
covers daily, practice and archive at once. They are not deleted — `ALL_POOLS`
still exposes them so a locale edition stays a switch, not a rewrite. Twelve
more carried the tag only because India was one reference dot among five
("Where does NORWAY belong?"); those were untagged, not filtered.

India mentions a player can be dealt: **336 -> 13**. The ₹ symbol: **10 -> 0**.

### Still open, deliberately
- **Region packs for other regions** (Africa, Americas, Europe, East/SE Asia,
  MENA, Oceania). This is authoring several hundred questions, not a code change.
- **A 30-day no-repeat guarantee** is not reachable by scheduling. The thinnest
  mode holds 33 questions and spends 2 a day, so the bank is dry after 16 days.
  30 days needs 60 per mode — 480 questions against 286 now. What IS fixed:
  zero consecutive-day repeats over 730 days (was a minimum gap of ONE day).
- `in-h4` ("which is oldest?" answering Taj Mahal when cricket is older) is in a
  filtered pack, so no player meets it. It stays wrong until that pack ships.
