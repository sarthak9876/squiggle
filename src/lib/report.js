/* "Found something wrong? Tell us" — with no way to tell anyone.
   A prefilled mailto carries the day and the question id, because a report that
   says "one of the chess ones was wrong" cannot be acted on. */
import { puzzleLabel } from './schedule.js';
import { BRAND } from '../brand.js';

export const REPORT_TO = BRAND.reportEmail;

export function reportLink({ day, mode, id, prompt }) {
  const subject = `${BRAND.name} ${puzzleLabel(day)} — problem with ${mode}/${id}`;
  const body = [
    `Question: ${prompt || ''}`,
    `Game: ${mode}`,
    `Question id: ${id}`,
    `Puzzle: ${puzzleLabel(day)}`,
    '',
    'What looks wrong?',
    '',
  ].join('\n');
  return `mailto:${REPORT_TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/* The same report as plain text.

   A mailto: does nothing at all on a device with no mail client configured —
   no error, no new window, nothing — so the player who spotted the mistake had
   no way to tell anyone and no idea the click had failed. There is no backend
   to POST a form to, and a third-party form would break the "no data leaves
   your browser" promise on the very page that makes it, so the fallback is the
   clipboard: the address and the question id, ready to paste anywhere. */
export function reportText({ day, mode, id, prompt }) {
  return [
    `To: ${REPORT_TO}`,
    `Subject: ${BRAND.name} ${puzzleLabel(day)} — problem with ${mode}/${id}`,
    '',
    `Question: ${prompt || ''}`,
    `Game: ${mode}`,
    `Question id: ${id}`,
    `Puzzle: ${puzzleLabel(day)}`,
    '',
    'What looks wrong?',
  ].join('\n');
}
