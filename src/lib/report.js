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
