import { ArtifactType, Domain, type ArtifactDraft } from '@shared/types';

export const PROJECT_DOMAINS = Object.values(Domain);

/** The quiet default the creation panel opens with. */
export const DEFAULT_PROJECT_DOMAIN = Domain.WORK;

/** A new project is a name and a domain; its page starts empty. */
export function buildProjectDraft(title: string, domain: Domain): ArtifactDraft {
  return { title, type: ArtifactType.PROJECT, domain };
}

/**
 * Command-Enter submits from anywhere in the panel. Plain Enter submits
 * natively through the form when focus is in the project-name input.
 */
export function isCommandSubmitKey(
  event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey'>,
): boolean {
  return event.key === 'Enter' && (event.metaKey || event.ctrlKey);
}

/** A project needs a non-empty name, and pending creation blocks resubmission. */
export function canSubmitProject(title: string, isPending: boolean): boolean {
  return title.trim().length > 0 && !isPending;
}
