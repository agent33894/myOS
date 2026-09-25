import { differenceInCalendarDays } from 'date-fns';
import { parseLocalDate } from '@shared/date';
import { captureDraft, parseCapture } from '@shared/inbox';
import { describeRule, parseRule } from '@shared/recurrence';
import { UPCOMING_DAYS } from '@shared/today';
import type { ArtifactDraft } from '@shared/types';
import { dayLabel, formatEstimate } from '../tasks/dates';
import type { ProjectRef } from '../tasks/projectRefs';

export type CaptureToken =
  | { kind: 'date'; label: string }
  | { kind: 'repeat'; label: string }
  | { kind: 'estimate'; label: string }
  | { kind: 'tag'; label: string }
  | { kind: 'project'; label: string; color: string }
  | { kind: 'new-project'; label: string; name: string }
  | { kind: 'flag'; label: string }
  | { kind: 'priority'; label: string };

export interface ResolvedCapture {
  draft: ArtifactDraft;
  tokens: CaptureToken[];
  /** Where it will land, in plain words: "Inbox", "Today", "Kitchen renovation · Tomorrow", "Tasks · Anytime". */
  destination: string;
}

/** "garage-sale" → "Garage sale": the title a new project gets from an `@name`. */
export const projectNameFrom = (ref: string) => {
  const words = ref.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** The place a task without a project shows up, named as it appears in the sidebar. */
function placeOf(due: string | undefined, flagged: boolean, now: Date): string {
  if (flagged) return 'Today';
  if (!due) return 'Tasks · Anytime';
  const days = differenceInCalendarDays(parseLocalDate(due), now);
  if (days <= 0) return 'Today';
  return `${days <= UPCOMING_DAYS ? 'Upcoming' : 'Tasks'} · ${dayLabel(due, now)}`;
}

/**
 * Quick Capture's reading of the text, shared with the file it becomes.
 * `@kitch` files into "Kitchen renovation"; an `@name` that matches no open
 * project stays as written until the person chooses to create that project.
 */
export function resolveCapture(text: string, projects: readonly ProjectRef[], now = new Date()): ResolvedCapture {
  const parsed = parseCapture(text, projects, now);
  const { project, unknownRef } = parsed;
  const when = parsed.due ? dayLabel(parsed.due, now) : undefined;
  const rule = parseRule(parsed.repeatRule);
  const tokens: CaptureToken[] = [
    ...(when ? [{ kind: 'date' as const, label: rule ? `From ${when}` : when }] : []),
    ...(rule ? [{ kind: 'repeat' as const, label: describeRule(rule) }] : []),
    ...(parsed.estimatedMinutes ? [{ kind: 'estimate' as const, label: formatEstimate(parsed.estimatedMinutes) }] : []),
    ...(project ? [{ kind: 'project' as const, label: project.title, color: project.color }] : []),
    ...(unknownRef ? [{ kind: 'new-project' as const, label: `Create project “${projectNameFrom(unknownRef)}”`, name: projectNameFrom(unknownRef) }] : []),
    ...(parsed.flagged ? [{ kind: 'flag' as const, label: 'Flagged' }] : []),
    ...(parsed.priority ? [{ kind: 'priority' as const, label: `${parsed.priority[0].toUpperCase()}${parsed.priority.slice(1)} priority` }] : []),
    ...parsed.tags.map((tag) => ({ kind: 'tag' as const, label: `#${tag}` })),
  ];

  const destination =
    parsed.kind !== 'task'
      ? 'Inbox'
      : project
        ? [project.title, when ?? (parsed.flagged ? 'Today' : undefined)].filter(Boolean).join(' · ')
        : placeOf(parsed.due, parsed.flagged, now);
  return { draft: captureDraft(parsed), tokens, destination };
}
