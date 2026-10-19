/* What a hint costs.

   A question that names something the player has simply never heard of —
   "measured at Mauna Loa" — produces frustration, not difficulty, and a
   frustrated player closes the tab rather than guessing. The hint explains the
   SUBJECT, never the answer, and costs a quarter of the score so taking it
   stays a real decision instead of a free pass.

   Kept out of GameScreen so the arithmetic can be tested without rendering a
   component, and so the fraction lives in exactly one place. */
export const HINT_KEEP = 0.75;

/** The score actually banked. `hinted` false returns the raw score untouched. */
export function applyHint(raw, hinted) {
  return hinted ? Math.round(raw * HINT_KEEP) : raw;
}
