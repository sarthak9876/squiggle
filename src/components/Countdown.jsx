import { useEffect, useState } from 'react';
import { msUntilTomorrow } from '../lib/schedule.js';

/** Live countdown to the next set. A visible clock turns "come back tomorrow"
 *  into a specific time, which is a far stronger return cue than a vague promise. */
export default function Countdown() {
  const [ms, setMs] = useState(msUntilTomorrow());
  useEffect(() => {
    const t = setInterval(() => setMs(msUntilTomorrow()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = n => String(n).padStart(2, '0');
  return (
    <span className="countdown" aria-live="off">
      {pad(Math.floor(s / 3600))}<i>:</i>{pad(Math.floor(s / 60) % 60)}<i>:</i>{pad(s % 60)}
    </span>
  );
}
