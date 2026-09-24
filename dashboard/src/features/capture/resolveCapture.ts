import { parseCapture, type ParsedCapture } from '@shared/inbox';
import { ArtifactType, type ArtifactDraft } from '@shared/types';
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

// A private-use character hides an unknown `@name` from the parser so it stays in the title.
const HIDDEN_AT = '';

/**
 * Quick Capture's reading of the text. `@kitch` files into "Kitchen
 * renovation" when a project starts that way; an `@name` that matches no
 * project stays as written and never creates a project.
 */
export function resolveCapture(
  text: string,
  match: (typed: string) => ProjectRef | undefined,
  now = new Date(),
): ResolvedCapture {
  let parsed: ParsedCapture = parseCapture(text, now);
  const project = parsed.projectRef ? match(parsed.projectRef) : undefined;
  const unknownRef = parsed.projectRef && !project ? parsed.projectRef : undefined;
  if (unknownRef) {
    const hidden = text.replace(new RegExp(`(^|\\s)@${unknownRef}(?=\\s|$)`), `$1${HIDDEN_AT}${unknownRef}`);
    parsed = parseCapture(hidden, now);
    parsed = { ...parsed, title: parsed.title.replace(HIDDEN_AT, '@') };
  }

  const task = Boolean(parsed.due || parsed.flagged || parsed.priority || project);
  const draft: ArtifactDraft = {
    type: task ? ArtifactType.TODO : ArtifactType.INBOX,
    title: parsed.title,
    content: parsed.body,
    tags: parsed.tags,
    due: parsed.due,
    flagged: parsed.flagged || undefined,
    priority: parsed.priority,
    project: project?.id,
  };

  const when = parsed.due ? dayLabel(parsed.due, now) : undefined;
  const tokens: CaptureToken[] = [
    ...(when ? [{ kind: 'date' as const, label: when }] : []),
    ...(project ? [{ kind: 'project' as const, label: project.title, color: project.color }] : []),
    ...(unknownRef ? [{ kind: 'new-project' as const, label: `@${unknownRef} · New project?` }] : []),
    ...(parsed.flagged ? [{ kind: 'flag' as const, label: 'Flagged' }] : []),
    ...(parsed.priority ? [{ kind: 'priority' as const, label: `${parsed.priority[0].toUpperCase()}${parsed.priority.slice(1)} priority` }] : []),
    ...parsed.tags.map((tag) => ({ kind: 'tag' as const, label: `#${tag}` })),
  ];

  const destination = task
    ? [project?.title ?? 'Tasks', when ?? (parsed.flagged ? 'Flagged' : undefined)].filter(Boolean).join(' · ')
    : 'Inbox';
  return { draft, tokens, destination };
}
