/* The Bias Fingerprint — the point of the whole product.

   A score of 897/1600 is forgettable. "You consistently underestimate big numbers"
   is a thing a person screenshots, because it is about THEM rather than about the
   questions. Computed from the signed direction of each miss, not its size. */

/** @typedef {{ id:string, title:string, blurb:string, emoji:string,
 *              lean:number, confidence:number, tags:string[] }} Fingerprint */

const TYPES = [
  { id:'doom',     emoji:'🌧️', title:'The Doom Optimist',
    blurb:'You think the world is worse than it is. It usually is not.',
    test: b => b.worldLean < -0.18 },
  { id:'skeptic',  emoji:'🔍', title:'The Big-Number Skeptic',
    blurb:'Shown something enormous, you quietly shave a zero off it.',
    test: b => b.magnitudeLean < -0.15 },
  { id:'hype',     emoji:'🚀', title:'The Hype Merchant',
    blurb:'Everything is bigger, faster and further along than it really is.',
    test: b => b.magnitudeLean > 0.15 },
  { id:'hedger',   emoji:'⚖️', title:'The Fence-Sitter',
    blurb:'You park near the middle and hope. It is safe. It is rarely right.',
    test: b => b.extremity < 0.3 },
  { id:'gambler',  emoji:'🎲', title:'The Swinger',
    blurb:'No half measures. When you are right you are very right.',
    test: b => b.extremity > 0.72 },
  { id:'shape',    emoji:'📈', title:'The Shape Reader',
    blurb:'You feel how things move even when you cannot name the number.',
    test: b => b.byMode.draw > 65 && b.byMode.size > 60 },
  { id:'sorter',   emoji:'🗂️', title:'The Librarian',
    blurb:'Order and categories are yours. Raw magnitude, less so.',
    test: b => (b.byMode.order + b.byMode.groups) / 2 > 70 },
  { id:'calib',    emoji:'🎯', title:'The Calibrated',
    blurb:'Genuinely rare. Your guesses land where reality actually is.',
    test: b => b.accuracy > 78 && Math.abs(b.magnitudeLean) < 0.1 },
];

const FALLBACK = { id:'learner', emoji:'🌱', title:'The Fresh Eyes',
  blurb:'Not enough guesses yet to read you. Play a full day and we will.' };

/**
 * @param {{mode:string, score:number, signedError?:number, magnitude?:number}[]} answers
 * @returns {Fingerprint}
 */
export function fingerprint(input) {
  // A saved day can contain holes (an interrupted run, a storage write that half
  // landed), and /results can now be entered cold with whatever is on disk. Filter
  // before counting, or `a.mode` throws on the first null and takes the app down.
  const answers = Array.isArray(input)
    ? input.filter(a => a && typeof a.score === 'number' && typeof a.mode === 'string')
    : [];
  if (answers.length < 4) {
    return { ...FALLBACK, lean:0, confidence:0, tags:[], accuracy:0,
             byMode:{ draw:0, order:0, place:0, share:0, odd:0, groups:0, shadow:0, size:0 } };
  }

  const byMode = {};
  for (const a of answers) {
    (byMode[a.mode] ||= []).push(a.score);
  }
  const modeAvg = {};
  for (const m in byMode) modeAvg[m] = Math.round(byMode[m].reduce((x,y)=>x+y,0) / byMode[m].length);

  const signed = answers.filter(a => typeof a.signedError === 'number');
  const mean = arr => arr.length ? arr.reduce((x,y)=>x+y,0) / arr.length : 0;

  const b = {
    accuracy: Math.round(mean(answers.map(a => a.score))),
    // Positive = you guess high. Negative = you guess low.
    magnitudeLean: mean(signed.map(a => a.signedError)),
    // Only on questions about the state of the world (poverty, literacy, vaccines).
    worldLean: mean(signed.filter(a => a.magnitude === 'world').map(a => a.signedError)),
    // How far from the safe middle you are willing to go.
    extremity: mean(answers.map(a => typeof a.extremity === 'number' ? a.extremity : 0.5)),
    byMode: { draw:0, order:0, place:0, share:0, odd:0, groups:0, shadow:0, size:0, ...modeAvg },
  };

  const hit = TYPES.find(t => { try { return t.test(b); } catch { return false; } }) || TYPES[3];
  return {
    id: hit.id, emoji: hit.emoji, title: hit.title, blurb: hit.blurb,
    lean: b.magnitudeLean, accuracy: b.accuracy, byMode: b.byMode,
    confidence: Math.min(1, answers.length / 16),
    tags: [
      b.magnitudeLean > 0.1 ? 'guesses high' : b.magnitudeLean < -0.1 ? 'guesses low' : 'well centred',
      `best at ${bestMode(modeAvg)}`,
      `${b.accuracy}% accurate`,
    ],
  };
}

function bestMode(modeAvg) {
  const entries = Object.entries(modeAvg);
  if (!entries.length) return 'nothing yet';
  const names = { draw:'drawing curves', order:'ordering', place:'placing', share:'percentages',
                  odd:'odd one out', groups:'grouping', shadow:'pictures', size:'scale' };
  const top = entries.sort((a,b) => b[1] - a[1])[0][0];
  return names[top] || top;
}
