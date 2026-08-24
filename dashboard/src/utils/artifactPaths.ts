import { ArtifactType, Domain } from '../types/artifacts';
import { deriveArtifactPathFromSpec } from '@shared/spec';

export function computeArtifactFilePath(args: {
  id: string;
  type: ArtifactType;
  domain?: Domain;
}): string {
  return deriveArtifactPathFromSpec(args);
}
