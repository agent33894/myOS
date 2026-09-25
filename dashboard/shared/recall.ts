import { dayOf, shiftDate } from './date';
import type { ArtifactFields } from './types';

export type RecallAnswer = 'again' | 'hard' | 'good' | 'easy';

/** The intervals (days) a note climbs when every answer is Good. */
const LADDER = [1, 3, 7, 16, 35];

const rungAfter = (interval: number) => LADDER.find((days) => days > interval) ?? Math.round(interval * 2);

/**
 * The next review after answering. Good climbs the ladder (at least doubling),
 * Easy stretches further, Hard grows a little, Again starts over at one day.
 */
export function schedule(answer: RecallAnswer, interval: number | undefined, today: string): { review: string; reviewInterval: number } {
  const current = interval && interval > 0 ? interval : 0;
  const next =
    answer === 'again'
      ? 1
      : answer === 'hard'
        ? Math.max(1, current + 1, Math.round(current * 1.2))
        : answer === 'good'
          ? Math.max(rungAfter(current), Math.round(current * 2))
          : Math.max(rungAfter(rungAfter(current)), Math.round(current * 2.5));
  return { review: shiftDate(today, next), reviewInterval: next };
}

type Reviewable = Pick<ArtifactFields, 'title' | 'review'>;

/**
 * Notes due for review, oldest first, at most `cap` a day. The rest roll
 * forward quietly: nothing piles up and skipping costs nothing.
 */
export function dueForReview<T extends Reviewable>(notes: readonly T[], today: string, cap = 10): T[] {
  return notes
    .filter((note) => (dayOf(note.review) ?? '9999') <= today)
    .sort((a, b) => a.review!.localeCompare(b.review!) || a.title.localeCompare(b.title))
    .slice(0, cap);
}
