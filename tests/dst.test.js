/* A day number must mean the same day everywhere on Earth.

   dayNumber() measured the gap between two LOCAL midnights in milliseconds and
   divided by 86,400,000. A local day is not always 86,400,000 ms long — twice a
   year it is 23 or 25 hours — so the division drifted:

     America/New_York   8 Mar and 9 Mar BOTH returned 66, and day 304 never
                        existed at all (1 Nov -> 303, 2 Nov -> 305).
     LAUNCH_DAY         291 in New York and London, 292 in Kolkata.

   A different LAUNCH_DAY means a different puzzle number, a different daily set
   and a challenge link that does not match. Two players comparing scores would
   have been playing different games from 2 Nov onwards.

   These run in subprocesses because the timezone has to be set before the date
   code is first evaluated, and because a test that silently shared the host's
   zone would pass everywhere except the zones that break. */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCHEDULE = fileURLToPath(new URL('../src/lib/schedule.js', import.meta.url));

/* Zones picked so each one breaks the old code differently: northern DST either
   side of the Atlantic, southern-hemisphere DST (shifts in the opposite months),
   a non-DST zone as the control, and a half-hour offset. */
const ZONES = [
  'America/New_York',
  'Europe/London',
  'Asia/Kolkata',      // no DST — the control
  'Pacific/Auckland',  // southern hemisphere
  'Australia/Adelaide',// +9:30 / +10:30
];

const SCRIPT = `
import { dayNumber, LAUNCH_DAY, dateOfDay } from ${JSON.stringify(SCHEDULE)};
const days = [];
// Every calendar date of 2026, walked by calendar fields so the walk itself
// cannot inherit the bug it is looking for.
for (let m = 0; m < 12; m++) {
  for (let d = 1; d <= 31; d++) {
    const probe = new Date(2026, m, d);
    if (probe.getMonth() !== m) continue;          // 31 Feb etc.
    days.push([m + 1, d, dayNumber(probe)]);
  }
}
process.stdout.write(JSON.stringify({
  LAUNCH_DAY,
  days,
  roundTrip: dateOfDay(dayNumber(new Date(2026, 10, 2))).toISOString().slice(0, 10),
}));
`;

const probe = tz => JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', SCRIPT],
  { env: { ...process.env, TZ: tz }, encoding: 'utf8' }));

describe('a day number means the same day in every timezone', () => {
  const seen = {};
  for (const tz of ZONES) {
    it(`${tz}: consecutive dates get consecutive day numbers`, () => {
      const { days } = (seen[tz] ||= probe(tz));
      const broken = [];
      for (let i = 1; i < days.length; i++) {
        const [m, d, n] = days[i];
        const step = n - days[i - 1][2];
        if (step !== 1) broken.push(`${d}/${m} stepped ${step} (to day ${n})`);
      }
      expect(broken, broken.join('\n')).toEqual([]);
    });

    it(`${tz}: no day number is skipped or repeated across 2026`, () => {
      const { days } = (seen[tz] ||= probe(tz));
      const nums = days.map(r => r[2]);
      expect(new Set(nums).size).toBe(nums.length);                 // none repeated
      expect(Math.max(...nums) - Math.min(...nums) + 1).toBe(nums.length); // none skipped
    });
  }

  it('LAUNCH_DAY is the same number everywhere', () => {
    const got = Object.fromEntries(ZONES.map(tz => [tz, (seen[tz] ||= probe(tz)).LAUNCH_DAY]));
    expect(new Set(Object.values(got)).size, JSON.stringify(got, null, 1)).toBe(1);
  });

  it('every zone agrees on the day number for the same date', () => {
    const rows = ZONES.map(tz => (seen[tz] ||= probe(tz)).days.map(r => r.join('/')).join(','));
    expect(new Set(rows).size, 'zones disagree about which date is which day').toBe(1);
  });

  it('dateOfDay round-trips the date dayNumber was given', () => {
    for (const tz of ZONES) {
      expect((seen[tz] ||= probe(tz)).roundTrip, tz).toBe('2026-11-02');
    }
  });
});
