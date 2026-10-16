/* The React key for the live question card.

   GameScreen seeds its answer state exactly once, with
   `useState(() => mode.init(item))`. That initialiser only re-runs on a remount,
   so the key has to change whenever ANY part of the slot changes — otherwise the
   new mode renders holding the previous mode's value shape (size/share expect
   {v, touched}, order/draw expect arrays) and throws on the first read.

   Keying on the index alone was not enough: /game/a → /game/b both sit at idx 0,
   so the card was reused across a mode swap and 27 of the 56 mode pairs threw.
   Mode + item id + index covers the three independent ways a slot can change:
   the game, the question within the game, and the position in the run. */
export function slotKey(slot, idx) {
  return `${slot?.mode}:${slot?.item?.id}:${idx}`;
}
