import { SIL } from '../content/emoji.js';
import Emo from '../components/Emo.jsx';
import Sil from '../components/Sil.jsx';
import { shuffled, hash } from '../lib/random.js';

/** SHAPES ONLY — four pictures, no labels. The one mode playable without reading.
 *
 *  Options are shuffled on display for the same reason Odd One Out's are: the
 *  authored order leaked the answer (26 of 39 sat in the first two slots). The
 *  permutation is seeded from the question id so the picture is stable. */
const orderOf = item => shuffled([...Array(item.options.length).keys()], hash(String(item.id) + ':so'));
export const shadow = {
  init: () => null,
  clear: () => null,
  detail: (item, v) => v === item.answer
    ? 'Correct — 100 for the right pick.'
    : `You picked the ${item.options[v]}. The answer is the ${item.options[item.answer]}.`,
  ready: v => v !== null,
  score: (item, v) => (v === item.answer ? 100 : 0),
  displayOrder: orderOf,
  Component: ({ item, value, setValue, revealed }) => {
  /* COLOUR, always. Silhouettes were borrowed from Size It Up, where they are
     right: there you compare two objects' SCALE and colour is a distraction.
     Here, recognising the object IS the entire game, and flattening to one
     colour destroys exactly the information the player needs — a phone became a
     white rounded rectangle, a camera became a folder, four animals became four
     white blobs. An unrecognisable option is not a hard question, it is a
     broken one.

     The answer tell this replaced (one coloured option among three white ones,
     and it was the answer) cannot happen when every tile is coloured. */
  return (
    <div className="m-shadow">
      {orderOf(item).map((i, slot) => {
        const key = item.options[i];
        return (
        <button key={key}
          className={'shadowopt'
            + (value === i ? ' sel' : '')
            + (revealed ? (i === item.answer ? ' ok' : (value === i ? ' bad' : ' dim')) : '')}
          disabled={revealed}
          onClick={() => setValue(i)}
          /* Was `Option ${n}`, which told a screen-reader user nothing at all —
             four indistinguishable options is not a playable question. The picture
             stays unlabelled on screen; the accessible name never was the puzzle. */
          aria-label={key}
          aria-pressed={value === i}>
          <Emo name={key} size={64} alt={revealed ? key : ''} className="bigemo" />
          <span className="cap">{revealed ? key : ''}</span>
        </button>
        );
      })}
    </div>
  );
  },
};
