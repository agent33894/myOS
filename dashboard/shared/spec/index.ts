export type {
  ArtifactTypeValue,
  DomainValue,
} from './artifact-spec';

export {
  buildScaffoldForType,
  deriveArtifactPathFromSpec,
  getAllowedStatusesForType,
  getArtifactSpec,
  getDefaultStatusForType,
  isStatusAllowedForType,
  normalizeDraftFromSpec,
  validateArtifactAgainstSpec,
} from './artifact-rules';

export type {
  ArtifactDraftInput,
} from './artifact-rules';
