import { ArtifactType, type ArtifactDraft } from '../types';
import { displayName } from './classify';
import type { MailItem } from './types';

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/**
 * A Task made from an email: the verdict's title and deadline, and a body
 * that says where it came from, so the task still makes sense without the mail.
 */
export function taskDraftFor(item: MailItem, overrides: { title?: string; due?: string; project?: string } = {}): ArtifactDraft {
  const who = item.verdict.lane === 'waiting' ? item.to[0] ?? item.from : item.from;
  const lines = [
    `From an email ${item.verdict.lane === 'waiting' ? 'to' : 'from'} **${displayName(who)}** · “${item.subject}” · ${shortDate(item.date)}`,
    '',
    ...(item.verdict.summary ? [`> ${item.verdict.summary}`, ''] : []),
    ...(item.webLink ? [`[Open the email](${item.webLink})`, ''] : []),
  ];
  const due = overrides.due ?? item.verdict.due;
  const project = overrides.project ?? item.verdict.task?.project;
  return {
    type: ArtifactType.TODO,
    title: overrides.title?.trim() || item.verdict.task?.title || item.subject,
    ...(due ? { due } : {}),
    ...(project ? { project } : {}),
    ...(item.verdict.priority === 'high' ? { flagged: true } : {}),
    content: lines.join('\n'),
  };
}
