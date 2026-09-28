import { formatLocalDate } from '@shared/date';
import { displayName } from '@shared/mail/classify';
import type { MailItem, MailSnapshot } from '@shared/mail/types';
import { laneItems, needsYou, waitingToFile } from '@shared/mail/select';
import { dayLabel, relativeTime } from '../tasks/dates';

export { displayName };

/** Who the row is about: the sender, or for Waiting the person you wrote to. */
export const counterpart = (item: MailItem) => (item.verdict.lane === 'waiting' ? item.to[0] ?? item.from : item.from);

export const when = (item: MailItem) => relativeTime(item.date);

export const dueLabel = (due: string) => `Due ${dayLabel(due).replace(/^(Today|Tomorrow)$/, (word) => word.toLowerCase())}`;

export function views(snapshot: MailSnapshot) {
  const { items, drafts } = snapshot;
  return {
    needs: needsYou(items),
    fyi: laneItems(items, ['fyi']),
    waiting: laneItems(items, ['waiting']),
    toFile: waitingToFile(items),
    outbox: drafts.filter((draft) => draft.status !== 'sent'),
  };
}

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/**
 * The line under the title: what needs you, in words, the way an assistant
 * would say it. "Sarah asked about Saturday. 2 more need you, 1 due today."
 */
export function briefing(snapshot: MailSnapshot): string {
  const { needs, fyi } = views(snapshot);
  if (snapshot.accounts.length === 0) return 'Connect an account and myOS will watch it for you.';
  if (needs.length === 0) {
    return fyi.length ? `Nothing needs you. ${plural(fyi.length, 'email')} to glance at when you like.` : 'Nothing needs you. Enjoy the quiet.';
  }
  const [first] = needs;
  const said = (first.verdict.summary || first.subject).split(/(?<=[.!?])\s/)[0];
  const lead = `${displayName(counterpart(first)).split(' ')[0]}: ${said.length > 110 ? `${said.slice(0, 108).trimEnd()}…` : said}`;
  const rest = needs.length - 1;
  const today = formatLocalDate();
  const dueSoon = needs.filter((item) => item.verdict.due && item.verdict.due <= today).length;
  const tail = [rest ? `${plural(rest, 'more needs', 'more need')} you` : null, dueSoon ? `${dueSoon} due today` : null].filter(Boolean).join(', ');
  return `${lead.endsWith('.') ? lead : `${lead}.`}${tail ? ` ${tail.charAt(0).toUpperCase()}${tail.slice(1)}.` : ''}`;
}

/** "Checked 3m ago", "Checking…", "Not checked yet". */
export function checkedLabel(snapshot: MailSnapshot): string {
  if (snapshot.status.running) return 'Checking…';
  if (!snapshot.status.lastRun) return 'Not checked yet';
  const label = relativeTime(snapshot.status.lastRun);
  return `Checked ${label === 'Just now' ? 'just now' : label}`;
}
