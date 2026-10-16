import { useEffect, useState } from 'react';
import { clamp } from './contract.js';

const PEOPLE = /\b(people|person|population|indians?|adults?|children|kids|players|students|teenagers|women|men|households|users|voters|humans|workers|drivers|speakers)\b/i;

/** WHAT SHARE? — one slider, a hundred dots, zero arithmetic.
 *  The dot grid turns an abstract percentage into a picture of a hundred people,
 *  which is the whole reason this mode replaced a Fermi-estimation one. */
/* `{ v, touched }` rather than a bare number, matching Size It Up.
   A slider parked on its 50% default with Submit already live is a free guess the
   other six games do not offer, and 50 is close enough on a lot of questions to
   score. One interaction — drag, click or arrow key — is required. */
export const share = {
  init: () => ({ v: 50, touched: false }),
  clear: () => ({ v: 50, touched: false }),
  ready: v => !!v.touched,
  score: (item, v) => clamp(Math.round(100 - Math.abs(v.v - item.answer) * 2.5), 0, 100),
  // Signed in percentage points, normalised — "you guess high" is the readable fact.
  signedError: (item, v) => (v.v - item.answer) / 100,
  extremity: (_i, v) => Math.abs(v.v - 50) / 50,
  numeric: (item, v) => ({ truth: item.answer, guess: v.v }),
  detail: (item, v) => {
    const off = Math.abs(v.v - item.answer);
    return off === 0 ? 'Exactly right.'
      : `You said ${v.v}%, the answer is ${item.answer}% — ${off} percentage point${off === 1 ? '' : 's'} out.`;
  },
  magnitude: () => 'world',
  Component: ({ item, value, setValue, revealed }) => {
    /* The truth used to pop in fully formed. Filling the dots one by one is the
       moment the player actually learns the number — it reads as the answer
       arriving rather than as a state change. ~6ms a dot, so 100 dots take
       600ms; instant under reduced motion. */
    const [fill, setFill] = useState(0);
    useEffect(() => {
      if (!revealed) { setFill(0); return; }
      const still = typeof matchMedia === 'function'
        && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (still) { setFill(item.answer); return; }
      let raf, t0 = performance.now();
      const tick = t => {
        const p = Math.min(1, (t - t0) / 600);
        setFill(Math.round(item.answer * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [revealed, item.answer]);

    return (
    <div className="m-share">
      {/* "A hundred people" is a lovely line and wrong for most of this pool —
          the share of Earth's water that is fresh is not a hundred people. Say it
          only when the question actually counts people. */}
      {/* The number first. It used to sit below the slider, i.e. dead last, which
          on a 667px screen put it behind the sticky action bar. */}
      <p className="readout">
        <b>{value.v}%</b> <span className="sub">{item.unit}</span>
        {revealed && <> · <b className="t">actually {item.answer}%</b></>}
      </p>
      <p className="dothint">
        {PEOPLE.test(`${item.prompt} ${item.unit || ''}`)
          ? 'Each dot is one person in a hundred.'
          : 'Each dot is one in a hundred.'}
      </p>
      {/* The dots are the obvious thing to click, so they have to work. Dragging
          across them sets the value too — holding the button down and sweeping is
          how people actually use a grid like this. */}
      <div className="dotgrid" role="group" aria-label="Pick a percentage">
        {Array.from({ length: 100 }, (_, i) => {
          const n = i + 1;
          return (
            <button key={i} type="button" tabIndex={-1} disabled={revealed}
              className={'dot' + (revealed && n <= fill ? ' truth' : '') + (n <= value.v ? ' mine' : '')}
              onPointerDown={() => !revealed && setValue({ v: n, touched: true })}
              onPointerEnter={e => { if (!revealed && e.buttons === 1) setValue({ v: n, touched: true }); }}
              aria-label={`${n}%`} />
          );
        })}
      </div>
      <input type="range" min="0" max="100" value={value.v} disabled={revealed}
             onChange={e => setValue({ v: +e.target.value, touched: true })} className="slider"
             aria-label={item.prompt} />
      {!revealed && !value.touched &&
        <p className="hintline">Drag the slider, or tap the dots.</p>}
    </div>
    );
  },
};
