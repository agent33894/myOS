import { describe, expect, it } from 'vitest';
import { ArtifactType } from '../../types';
import {
  deriveArtifactPathFromSpec,
  getDefaultDomainForType,
  getDefaultStatusForType,
  normalizeDraftFromSpec,
  validateArtifactAgainstSpec,
  type ArtifactDraftInput,
  type SpecArtifact,
} from '../artifact-rules';

const now = '2026-02-07';
const baseOptions = {
  now,
  generateId: () => 'generated-id',
};

describe('normalizeDraftFromSpec', () => {
  it('applies deterministic defaults for every artifact type', () => {
    for (const type of Object.values(ArtifactType)) {
      const { artifact } = normalizeDraftFromSpec(
        {
          type,
          title: `Example ${type}`,
        },
        baseOptions
      );

      expect(artifact.id).toBe('generated-id');
      expect(artifact.created).toBe(now);
      expect(artifact.updated).toBe(now);
      expect(artifact.tags).toEqual([]);
      expect(artifact.related).toEqual([]);
      expect(artifact.status).toBe(getDefaultStatusForType(type));
      expect(artifact.filePath).toBe(
        deriveArtifactPathFromSpec({
          id: artifact.id,
          type,
          domain: artifact.domain,
        })
      );

      if (type === ArtifactType.INBOX) {
        expect(artifact.domain).toBeUndefined();
      } else {
        expect(artifact.domain).toBe(getDefaultDomainForType(type));
      }

      const validation = validateArtifactAgainstSpec(artifact);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    }
  });

  it('rejects invalid status deterministically in strict mode', () => {
    expect(() =>
      normalizeDraftFromSpec(
        {
          type: ArtifactType.QUERY,
          title: 'Invalid status query',
          status: 'pending' as SpecArtifact['status'],
        },
        {
          ...baseOptions,
          strictStatus: true,
        }
      )
    ).toThrow('Invalid status "pending" for type "query"');
  });

  it('normalizes invalid status to default in non-strict mode', () => {
    const { artifact, warnings } = normalizeDraftFromSpec(
      {
        type: ArtifactType.QUERY,
        title: 'Legacy query',
        status: 'pending' as SpecArtifact['status'],
      },
      {
        ...baseOptions,
        strictStatus: false,
      }
    );

    expect(artifact.status).toBe(getDefaultStatusForType(ArtifactType.QUERY));
    expect(warnings[0]).toContain('Invalid status "pending" for type "query"');
  });

  it('allows missing domain for inbox and infers domain for non-inbox', () => {
    const inbox = normalizeDraftFromSpec(
      {
        type: ArtifactType.INBOX,
        title: 'Inbox note',
      },
      baseOptions
    );
    expect(inbox.artifact.domain).toBeUndefined();

    const memo = normalizeDraftFromSpec(
      {
        type: ArtifactType.MEMO,
        title: 'Memo draft',
        domain: 'unknown' as ArtifactDraftInput['domain'],
      },
      {
        ...baseOptions,
        strictStatus: false,
      }
    );
    expect(memo.artifact.domain).toBe(getDefaultDomainForType(ArtifactType.MEMO));
    expect(memo.warnings.join(' ')).toContain('Invalid domain "unknown"');
  });

  it('derives a contextual title when title is missing', () => {
    const { artifact } = normalizeDraftFromSpec(
      {
        type: ArtifactType.RESEARCH,
        tags: ['tariff-modeling', 'gdp'],
      },
      baseOptions
    );

    expect(artifact.title).toBe('Research: Tariff Modeling + Gdp');
  });

  it('replaces generic titles with contextual titles from content', () => {
    const { artifact } = normalizeDraftFromSpec(
      {
        type: ArtifactType.MEMO,
        title: 'Untitled',
        content: '# Fix tooltip clipping in research charts\n\n## Notes\n- Keep tooltip in bounds',
      },
      baseOptions
    );

    expect(artifact.title).toBe('Fix tooltip clipping in research charts');
  });
});

describe('validateArtifactAgainstSpec', () => {
  it('fails on empty required fields with explicit validation errors', () => {
    const { artifact } = normalizeDraftFromSpec(
      {
        type: ArtifactType.TODO,
        title: 'Valid todo',
      },
      baseOptions
    );

    const invalid = {
      ...artifact,
      title: '   ',
    };

    const result = validateArtifactAgainstSpec(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Missing required field "title" for type "todo"'
    );
  });
});
