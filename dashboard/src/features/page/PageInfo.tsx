import { formatLocalDate } from '@shared/date';
import type { ArtifactSummary } from '@shared/types';
import { wordCount } from '../journal/entries';
import { dayLabel, inSentence, relativeTime } from '../tasks/dates';

/** Words per minute for an unhurried read. */
const READING_PACE = 230;

/** The foot of a page's ⋯ menu: how long it is and when it was made and last changed. */
export function PageInfo({ item }: { item: ArtifactSummary }) {
  const words = wordCount(item.searchText);
  const minutes = Math.max(1, Math.round(words / READING_PACE));
  const created = item.created.slice(0, 10);
  // Hand-edited or imported files can carry an edit stamp older than their creation day; say only what's true.
  const edited = formatLocalDate(new Date(item.updated)) >= created ? ` · Edited ${inSentence(relativeTime(item.updated))}` : '';
  const length = words === 0 ? 'No words yet' : `${words.toLocaleString()} ${words === 1 ? 'word' : 'words'} · ${minutes} min read`;
  return (
    <div className="flex flex-col gap-0.5 px-2 pb-1.5 pt-1 text-xs text-text-tertiary">
      <span>{length}</span>
      <span>
        Created {inSentence(dayLabel(created))}
        {edited}
      </span>
    </div>
  );
}
