/* A corrupt save must lose your history, not the whole app.

   localStorage is shared, editable, and survives every deploy. A half-written
   value, an old schema, a browser extension, a hand-edited key — any of them
   and the saved run is no longer the shape the code expects. Reading it
   straight into state put junk where a list of scored answers belonged, and
   Results does `answers.reduce((a, b) => a + b.score, 0)` on the first paint.
   App's own render is ABOVE the ErrorBoundary it returns, so nothing catches
   that and the page goes white — with the bad value still in storage, so every
   reload does it again. The game becomes permanently unopenable.

   coldResults already guarded itself after exactly that crash. The other four
   read sites did not, so the same junk still got through a different door. */
import { describe, it, expect } from 'vitest';
import { bankedAnswers } from '../src/lib/storage.js';

const good = [{ mode: 'size', score: 80 }, { mode: 'odd', score: 100 }];

describe('reading a banked day out of storage', () => {
  it('returns the answers when they are what they claim to be', () => {
    expect(bankedAnswers({ answers: { 5: good } }, 5)).toEqual(good);
  });

  it('is null when the day was never played', () => {
    expect(bankedAnswers({ answers: {} }, 5)).toBeNull();
    expect(bankedAnswers({}, 5)).toBeNull();
    expect(bankedAnswers(null, 5)).toBeNull();
  });

  it('rejects anything that is not a list of scored answers', () => {
    const junk = [
      'played', 42, true, {}, { length: 2 }, [], [null], [undefined],
      [{ mode: 'size' }],                       // no score
      [{ mode: 'size', score: 'eighty' }],      // score is not a number
      [{ mode: 'size', score: 80 }, 'oops'],    // one bad entry spoils it
    ];
    for (const j of junk) {
      expect(bankedAnswers({ answers: { 5: j } }, 5), JSON.stringify(j)).toBeNull();
    }
  });

  it('never throws, whatever it is handed', () => {
    for (const s of [null, undefined, 'x', 42, [], { answers: 'x' }, { answers: 42 }]) {
      expect(() => bankedAnswers(s, 5), String(s)).not.toThrow();
      expect(bankedAnswers(s, 5)).toBeNull();
    }
  });

  it('a total can always be summed from whatever it returns', () => {
    // The operation that actually crashed. If this is safe, the paint is safe.
    for (const s of [null, { answers: { 5: 'x' } }, { answers: { 5: [1, 2] } }, { answers: { 5: good } }]) {
      const a = bankedAnswers(s, 5) || [];
      expect(() => a.reduce((x, b) => x + b.score, 0)).not.toThrow();
    }
  });
});
