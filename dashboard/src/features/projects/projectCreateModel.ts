import { getArtifactSpec, getDefaultDomainForType } from '@shared/spec/artifact-rules';
import type { ArtifactDraft } from '@/gateways/artifactsGateway';
import { ArtifactStatus, ArtifactType, Domain } from '../../types/artifacts';

/** Domains a project may live in, in spec order (Work first). */
export const PROJECT_DOMAINS = getArtifactSpec(ArtifactType.PROJECT)
  .allowedDomains as readonly Domain[];

/** The quiet default the creation panel opens with. */
export const DEFAULT_PROJECT_DOMAIN = (getDefaultDomainForType(ArtifactType.PROJECT) ??
  Domain.WORK) as Domain;

/**
 * The complete draft a new project is created from: name and domain only.
 * Projects carry no due date — scheduling belongs to future milestones — and
 * omitting content lets the spec scaffold (Intent / Outcomes / Rationale)
 * build the brief.
 */
export function buildProjectDraft(title: string, domain: Domain): ArtifactDraft {
  return {
    title,
    type: ArtifactType.PROJECT,
    domain,
    status: ArtifactStatus.ACTIVE,
  };
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
