/* Round axis values, shared by Draw The Curve and Place The Dot.

   Both charts used to cut their range into four equal parts, which is
   arithmetically correct and unreadable: a 0-55 axis labelled 0, 14, 28, 41, 55,
   and a 0-30 axis whose fourth gridline sat at 22.5 and was LABELLED 23 — the
   number disagreed with the line it pointed at, which is worse than ugly.

   Step up through 1 / 2 / 2.5 / 5 x 10^n and take whatever lands inside the
   range. `count` is a target, not a promise: the step that gets CLOSEST to it
   wins, so a span of 55 picks 10 (six ticks) over 20 (three), where taking the
   first step at or above span/(count-1) would always round the count down. */
export function niceTicks(min, max, count = 5) {
  const span = max - min;
  if (!(span > 0)) return [min];
  const raw = span / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const steps = [1, 2, 2.5, 5, 10].map(m => m * mag);
  const at = step => {
    const out = [];
    for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) {
      out.push(+v.toFixed(10));
    }
    return out;
  };
  let best = null;
  for (const s of steps) {
    const t = at(s);
    // Two ticks is not an axis; more than twice the target is a ruler.
    if (t.length < 2 || t.length > count * 2) continue;
    if (!best || Math.abs(t.length - count) < Math.abs(best.length - count)) best = t;
  }
  return best || [min, max];
}
