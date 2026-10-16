import { useEffect, useRef } from 'react';
import { ADS } from '../lib/flags.js';

/* An ad slot that reserves its space whether or not an ad ever loads.

   Two things this is built to avoid:
   1. Layout shift. The slot has a fixed min-height from the first paint, so the
      page does not jump when a unit fills late. CLS is the metric ad scripts
      wreck first, and it is also a Core Web Vital.
   2. Ads inside the question. `ADS.placements` deliberately has no 'question'
      key — an ad next to a thing you are estimating is an ad that changes the
      answer, and it is the fastest way to make the game feel cheap.

   Switched off until `ADS.enabled` is true, which needs a live domain and an
   approved publisher account. Until then this renders nothing at all. */
export default function AdSlot({ slot, className = '' }) {
  const ref = useRef(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!ADS.enabled || !ADS.placements.includes(slot) || pushed.current) return;
    pushed.current = true;      // StrictMode mounts twice in dev; push once.
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch { /* blocked, offline, or no script — the reserved box just stays empty */ }
  }, [slot]);

  if (!ADS.enabled || !ADS.placements.includes(slot)) return null;

  return (
    <div className={'adslot ' + className} data-slot={slot}
         style={{ minHeight: ADS.heights[slot] || 90 }}>
      <span className="adlabel">Advertisement</span>
      <ins ref={ref} className="adsbygoogle" style={{ display: 'block' }}
           data-ad-client={ADS.client} data-ad-slot={ADS.slots[slot]}
           data-ad-format="auto" data-full-width-responsive="true" />
    </div>
  );
}
