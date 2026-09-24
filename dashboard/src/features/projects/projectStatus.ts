import { ArtifactStatus } from '@shared/types';
import { PROJECT_CLOSED_STATUSES } from '../../data/projects';

/** The project statuses people choose between, in plain words. `draft` reads as Someday. */
export const PROJECT_STATUSES = [
  { value: ArtifactStatus.ACTIVE, label: 'Active' },
  { value: ArtifactStatus.DRAFT, label: 'Someday' },
  { value: ArtifactStatus.DONE, label: 'Done' },
  { value: ArtifactStatus.CANCELLED, label: 'Cancelled' },
] as const;

export const statusLabel = (status: string) =>
  PROJECT_STATUSES.find((option) => option.value === status)?.label ?? (status === 'archived' ? 'Archived' : 'Active');

export type ProjectGroup = 'active' | 'someday' | 'closed';

export function projectGroup(status: string): ProjectGroup {
  if (PROJECT_CLOSED_STATUSES.has(status)) return 'closed';
  return status === ArtifactStatus.DRAFT ? 'someday' : 'active';
}
