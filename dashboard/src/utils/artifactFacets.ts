import type { ArtifactSummary } from '@shared/types';

interface ArtifactFacets {
  tagFrequency: Record<string, number>;
  projectFrequency: Record<string, number>;
}

export function deriveArtifactFacets(artifacts: ArtifactSummary[]): ArtifactFacets {
  const facets: ArtifactFacets = {
    tagFrequency: {},
    projectFrequency: {},
  };

  for (const artifact of artifacts) {
    for (const tag of artifact.tags) {
      facets.tagFrequency[tag] = (facets.tagFrequency[tag] || 0) + 1;
    }
    if (artifact.project) {
      facets.projectFrequency[artifact.project] =
        (facets.projectFrequency[artifact.project] || 0) + 1;
    }
  }

  return facets;
}
