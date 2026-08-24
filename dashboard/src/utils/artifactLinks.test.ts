import { describe, expect, it } from 'vitest';
import type { Artifact } from '../types/artifacts';
import { ArtifactStatus, ArtifactType } from '../types/artifacts';
import { findLinkedArtifact } from './artifactLinks';

function artifact(id: string, filePath: string): Artifact {
  return {
    id,
    filePath,
    title: id,
    content: '',
    type: ArtifactType.MEMO,
    tags: [],
    created: '2026-08-14',
    updated: '2026-08-14',
    status: ArtifactStatus.ACTIVE,
    related: [],
  };
}

const artifacts = [
  artifact('fermi-estimation', 'personal/memos/fermi-estimation.md'),
  artifact('project-plan', 'work/projects/project plan.md'),
];

describe('findLinkedArtifact', () => {
  it('resolves paths relative to the current artifact', () => {
    expect(findLinkedArtifact(
      '../memos/fermi-estimation.md',
      'personal/projects/embracing-curiosity.md',
      artifacts,
    )?.id).toBe('fermi-estimation');
  });

  it('accepts root-relative, encoded, and myOS artifact links', () => {
    expect(findLinkedArtifact('/work/projects/project%20plan.md', undefined, artifacts)?.id)
      .toBe('project-plan');
    expect(findLinkedArtifact(
      'myos://artifact?artifact=personal%2Fmemos%2Ffermi-estimation.md',
      undefined,
      artifacts,
    )?.id).toBe('fermi-estimation');
  });

  it('ignores external, local-anchor, and escaping links', () => {
    expect(findLinkedArtifact('https://example.com', 'personal/projects/a.md', artifacts)).toBeNull();
    expect(findLinkedArtifact('#outcomes', 'personal/projects/a.md', artifacts)).toBeNull();
    expect(findLinkedArtifact('../../../outside.md', 'personal/projects/a.md', artifacts)).toBeNull();
  });
});
