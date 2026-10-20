import { describe, it, expect } from 'vitest';
import { parse, href } from '../src/lib/router.js';
import { fingerprint } from '../src/lib/bias.js';
import { SLOTS } from '../src/lib/schedule.js';

/* The three P0s from pre-launch QA, pinned.
   /results, /game/:bogus and /nonexistent-page each produced a page with no
   content — the first a white screen with the whole tree unmounted. */
describe('routing', () => {
  it('accepts only the eight real game ids', () => {
    for (const id of new Set(SLOTS)) expect(parse('/game/' + id)).toEqual({ name: 'game', id });
  });

  it('sends an unknown game id to notfound, not to an empty shell', () => {
    expect(parse('/game/bogus').name).toBe('notfound');
    expect(parse('/game/GROUPS')).toEqual({ name: 'game', id: 'groups' });   // case-insensitive
  });

  it('sends an unknown path to notfound, not to home', () => {
    expect(parse('/nonexistent-page').name).toBe('notfound');
    expect(parse('/results/extra').name).toBe('notfound');
    expect(parse('/').name).toBe('home');
    expect(parse('/play').name).toBe('play');
    expect(parse('/results').name).toBe('results');
    expect(parse('/archive').name).toBe('archive');
    expect(parse('/about').name).toBe('about');
    expect(parse('/privacy').name).toBe('privacy');
    expect(parse('/terms').name).toBe('terms');
  });

  it('round-trips every route it can build', () => {
    for (const r of [{ name:'play' }, { name:'results' }, { name:'archive' }, { name:'about' },
                     { name:'privacy' }, { name:'terms' }, { name:'game', id:'share' }])
      expect(parse(href(r)).name).toBe(r.name);
  });
});

describe('fingerprint is total', () => {
  const ok = n => Array.from({ length: n }, (_, i) =>
    ({ mode: 'share', score: 50, signedError: 0.1, extremity: 0.5 }));

  it('survives empty, null and holey input', () => {
    for (const bad of [undefined, null, [], [null, null], 'nonsense', [{}, {}, {}, {}]])
      expect(() => fingerprint(bad)).not.toThrow();
    expect(fingerprint(null).id).toBe('learner');
    expect(fingerprint([{}, {}, {}, {}]).id).toBe('learner');   // no score/mode = not an answer
  });

  it('ignores holes but still reads a full day', () => {
    const holey = [...ok(8), null, undefined, ...ok(6)];
    expect(() => fingerprint(holey)).not.toThrow();
    expect(fingerprint(holey).accuracy).toBe(50);
  });

  it('always returns every mode key so byMode lookups are safe', () => {
    for (const fp of [fingerprint(null), fingerprint(ok(16))])
      for (const m of ['draw','order','place','share','odd','groups','shadow','size'])
        expect(typeof fp.byMode[m]).toBe('number');
  });
});

/* Two games have slugs that do not match their internal key, because the key is
   older than the name on the card. The round trip is the thing to protect: a
   link shared before the rename must still land on the game, and href() must
   never emit the old spelling again. */
describe('game slugs', () => {
  it('the name-shaped slug resolves to the internal key', () => {
    expect(parse('/game/shapes')).toEqual({ name: 'game', id: 'shadow' });
    expect(parse('/game/sets')).toEqual({ name: 'game', id: 'groups' });
  });

  it('the old slug still works, so shared links do not break', () => {
    expect(parse('/game/shadow')).toEqual({ name: 'game', id: 'shadow' });
    expect(parse('/game/groups')).toEqual({ name: 'game', id: 'groups' });
  });

  /* The canonical form is what App rewrites the address bar to. If href kept
     emitting /game/shadow the redirect would be a no-op and the rename would
     exist only in this file. */
  it('href emits the new slug and only the new slug', () => {
    expect(href({ name: 'game', id: 'shadow' })).toBe('/game/shapes');
    expect(href({ name: 'game', id: 'groups' })).toBe('/game/sets');
  });

  it('every game id round-trips through href and parse', () => {
    for (const id of SLOTS) {
      expect(parse(href({ name: 'game', id })), id).toEqual({ name: 'game', id });
    }
  });
});
