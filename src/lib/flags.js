/* Feature flags.

   CROWD_ENABLED gates every "what everyone else guessed" surface. It is OFF for
   launch because there is no backend: the histogram, the grey comparison lines on
   Draw The Curve and the "roughly N% get this right" copy were all generated from
   a mock distribution. Labelling that "Sample — real data coming soon" was not
   enough — the sentences built on top of it contradicted each other on screen
   ("Roughly 78% get this right … Most people are not this close") and the home
   page promised "where the crowd landed" as if it were a feature.

   Turning this on later means ALSO updating the footer privacy line, which
   currently promises "no data leaves your browser". Real crowd data breaks that
   promise, and shipping the feature without changing the line would be a lie. */
export const CROWD_ENABLED = false;

/* ADS — off until there is a live domain and an approved publisher account.

   `placements` is the whole policy in one array. There is no 'question' or
   'reveal' entry on purpose: an ad beside a number you are being asked to
   estimate changes the answer, and a game that interrupts its own puzzle to sell
   something stops being worth sharing. Ads live between rounds and on pages that
   are already a resting point.

   Turning this on: set enabled true, put the real publisher id in `client` and
   the unit ids in `slots`, and add the AdSense script tag to index.html. The
   footer privacy line must change at the same time — an ad script is a third
   party reading the page, so "no tracking" stops being true. */
export const ADS = {
  enabled: false,
  client: '',                       // ca-pub-XXXXXXXXXXXXXXXX
  slots: { home: '', results: '', archive: '' },
  placements: ['home', 'results', 'archive'],
  heights: { home: 100, results: 250, archive: 100 },
};
