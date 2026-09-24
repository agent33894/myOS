import { captureDraft, parseCapture } from '@shared/inbox';
import type { ArtifactDraft } from '@shared/types';
import { dayLabel } from '../tasks/dates';
import type { ProjectRef } from '../tasks/projectRefs';

export type CaptureToken =
  | { kind: 'date'; label: string }
  | { kind: 'tag'; label: string }
  | { kind: 'project'; label: string; color: string }
  | { kind: 'new-project'; label: string }
  | { kind: 'flag'; label: string }
  | { kind: 'priority'; label: string };

export interface ResolvedCapture {
  draft: ArtifactDraft;
  tokens: CaptureToken[];
  /** Where it will land, in plain words: "Inbox" or "Kitchen renovation · Tomorrow". */
  destination: string;
}

/**
 * Quick Capture's reading of the text, shared with the file it becomes.
 * `@kitch` files into "Kitchen renovation"; an `@name` that matches no open
 * project stays as written and never creates a project.
 */
export function resolveCapture(text: string, projects: readonly ProjectRef[], now = new Date()): ResolvedCapture {
  const parsed = parseCapture(text, projects, now);
  const { project, unknownRef } = parsed;
  const when = parsed.due ? dayLabel(parsed.due, now) : undefined;
  const tokens: CaptureToken[] = [
    ...(when ? [{ kind: 'date' as const, label: when }] : []),
    ...(project ? [{ kind: 'project' as const, label: project.title, color: project.color }] : []),
    ...(unknownRef ? [{ kind: 'new-project' as const, label: `@${unknownRef} · New project?` }] : []),
    ...(parsed.flagged ? [{ kind: 'flag' as const, label: 'Flagged' }] : []),
    ...(parsed.priority ? [{ kind: 'priority' as const, label: `${parsed.priority[0].toUpperCase()}${parsed.priority.slice(1)} priority` }] : []),
    ...parsed.tags.map((tag) => ({ kind: 'tag' as const, label: `#${tag}` })),
  ];

  const destination = parsed.kind === 'task'
    ? [project?.title ?? 'Tasks', when ?? (parsed.flagged ? 'Flagged' : undefined)].filter(Boolean).join(' · ')
    : 'Inbox';
  return { draft: captureDraft(parsed), tokens, destination };
}
