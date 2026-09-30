import { format } from 'date-fns';
import { parseLocalDate } from '@shared/date';

/** "Wednesday, September 23" (with the year when it isn't this year). */
export function longDate(stamp: string, now = new Date()): string {
  const date = parseLocalDate(stamp);
  return format(date, date.getFullYear() === now.getFullYear() ? 'EEEE, MMMM d' : 'EEEE, MMMM d, yyyy');
}

/** The first few lines someone wrote, without Markdown marks or section headings. */
export function firstLines(markdown: string | undefined, count = 3): string[] {
  return (markdown ?? '')
    .split('\n')
    .map((line) =>
      line
        .trim()
        .replace(/^([-*+]|\d+\.)\s+(\[[ xX]\]\s+)?/, '')
        .replace(/^>\s?/, '')
        .replace(/!?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target: string, label?: string) => label ?? target)
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[*_~`]+/g, ''),
    )
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('---'))
    .slice(0, count);
}

/** The month (YYYY-MM) `by` months from `month`. */
export function shiftMonth(month: string, by: number): string {
  const [year, index] = month.split('-').map(Number);
  const date = new Date(year, index - 1 + by, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Roughly how many words someone wrote; Markdown marks on their own (`##`, `-`, `---`) don't count. */
export function wordCount(text: string | undefined): number {
  return (text ?? '').split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}
