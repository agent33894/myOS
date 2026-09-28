import type { MailItem, MailLane } from './types';

const RANK = { high: 0, normal: 1, low: 2 } as const;

/** Open mail in a lane: high priority first, then the nearest deadline, then newest. */
export function laneItems(items: readonly MailItem[], lanes: readonly MailLane[]): MailItem[] {
  return items
    .filter((item) => item.state === 'open' && lanes.includes(item.verdict.lane) && (item.verdict.lane !== 'handled' || item.folder === 'INBOX'))
    .sort(
      (a, b) =>
        RANK[a.verdict.priority] - RANK[b.verdict.priority] ||
        (a.verdict.due ?? '9999').localeCompare(b.verdict.due ?? '9999') ||
        b.date.localeCompare(a.date),
    );
}

/** What the sidebar counts and the tray reports: mail that needs an action or a reply. */
export const needsYou = (items: readonly MailItem[]) => laneItems(items, ['action', 'reply']);

/** Handled mail still in the inbox: what Watch mode would file. */
export const waitingToFile = (items: readonly MailItem[]) =>
  laneItems(items, ['handled']).filter((item) => item.verdict.filing !== 'keep');
