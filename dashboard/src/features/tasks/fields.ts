import { dayOf, formatLocalDate } from '@shared/date';
import { describeRule, firstOccurrence, formatRule, parseRule, type RepeatRule } from '@shared/recurrence';
import type { ArtifactSummary } from '@shared/types';
import { patch } from '../../data/gateway';

/** Frontmatter edits for the planning properties; each is one undo step. */

export const setEstimate = (task: ArtifactSummary, minutes: number | null) =>
  patch(task.filePath, { estimatedMinutes: minutes }, minutes ? `Estimate “${task.title}”` : `Clear the estimate of “${task.title}”`);

export const setWhen = (task: ArtifactSummary, when: string | null) =>
  patch(task.filePath, { when: when?.trim() || null }, `Set when for “${task.title}”`);

/**
 * Repeat a task (or stop). A task without a date gets its first occurrence
 * from today, so it always has somewhere to show up.
 */
export function setRepeat(task: ArtifactSummary, rule: RepeatRule | null) {
  if (!rule) return patch(task.filePath, { repeatRule: null }, `Stop repeating “${task.title}”`);
  const due = dayOf(task.due) ?? firstOccurrence(rule, formatLocalDate());
  return patch(task.filePath, { repeatRule: formatRule(rule), due }, `Repeat “${task.title}”`);
}

/** "Every Tue" for a task's stored rule, or null. */
export function repeatLabel(task: Pick<ArtifactSummary, 'repeatRule'>): string | null {
  const rule = parseRule(task.repeatRule);
  return rule ? describeRule(rule) : null;
}

/** Common estimates, in minutes. */
export const ESTIMATES = [15, 30, 45, 60, 90, 120, 180] as const;

/** "45m", "1.5h", "~2h", "1h 30m", or a bare number of minutes; null when unreadable. */
export function parseEstimate(text: string): number | null {
  const value = text.trim().replace(/^~/, '').toLowerCase();
  if (/^\d+$/.test(value)) return Number(value) || null;
  const match = /^(?:(\d+(?:\.\d+)?)\s*h(?:rs?|ours?)?)?\s*(?:(\d+)\s*m(?:ins?|inutes?)?)?$/.exec(value);
  if (!match || (!match[1] && !match[2])) return null;
  return Math.round(Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0)) || null;
}
