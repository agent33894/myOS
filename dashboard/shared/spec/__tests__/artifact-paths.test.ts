import { describe, expect, it } from 'vitest';
import { ArtifactType, Domain } from '../../types';
import {
  DOMAIN_DIRECTORY_MAP,
  TYPE_DIRECTORY_MAP,
  deriveArtifactPathFromSpec,
} from '../artifact-rules';

describe('deriveArtifactPathFromSpec', () => {
  it('derives canonical vault-relative paths by type/domain', () => {
    expect(
      deriveArtifactPathFromSpec({
        id: 'todo-1',
        type: ArtifactType.TODO,
        domain: Domain.WORK,
      })
    ).toBe('work/todos/todo-1.md');

    expect(
      deriveArtifactPathFromSpec({
        id: 'query-1',
        type: ArtifactType.QUERY,
        domain: Domain.RESEARCH,
      })
    ).toBe('research/queries/query-1.md');

    expect(
      deriveArtifactPathFromSpec({
        id: 'snippet-1',
        type: ArtifactType.SNIPPET,
        domain: Domain.PERSONAL,
      })
    ).toBe('personal/code/snippet-1.md');

    expect(
      deriveArtifactPathFromSpec({
        id: 'inbox-1',
        type: ArtifactType.INBOX,
        domain: Domain.WORK,
      })
    ).toBe('inbox/inbox-1.md');
  });

  it('uses type defaults when optional domain is omitted', () => {
    expect(
      deriveArtifactPathFromSpec({
        id: 'research-default',
        type: ArtifactType.RESEARCH,
      })
    ).toBe('research/topics/research-default.md');
  });

  it('throws on empty id', () => {
    expect(() =>
      deriveArtifactPathFromSpec({
        id: '  ',
        type: ArtifactType.MEMO,
        domain: Domain.WORK,
      })
    ).toThrow('Artifact id is required to derive a file path');
  });
});

describe('directory maps', () => {
  it('covers all known domains and artifact types', () => {
    expect(Object.keys(DOMAIN_DIRECTORY_MAP).sort()).toEqual(
      Object.values(Domain).sort()
    );
    expect(Object.keys(TYPE_DIRECTORY_MAP).sort()).toEqual(
      Object.values(ArtifactType).sort()
    );
  });
});
