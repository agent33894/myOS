import { describe, expect, it } from 'vitest';
import { ArtifactStatus, ArtifactType, type Artifact } from '../../types/artifacts';
import {
  buildProjectInkMap,
  buildSections,
  mastheadCounts,
  projectInkFor,
  SECTION_CAP,
  typeMatchCounts,
} from './libraryIndex';

let seq = 0;
function makeArtifact(overrides: Partial<Artifact>): Artifact {
  seq += 1;
  return {
    id: `artifact-${seq}`,
    title: `Artifact ${seq}`,
    type: ArtifactType.MEMO,
    tags: [],
    status: 'active',
    related: [],
    content: '',
    created: '2026-08-01',
    updated: '2026-08-01T00:00:00.000Z',
    filePath: `vault/work/memos/artifact-${seq}.md`,
    ...overrides,
  } as Artifact;
}

const hit = (artifact: Artifact) => ({ artifact, score: 1 });

describe('buildSections', () => {
  it('groups browse mode by type in editorial order with a trailing archive section', () => {
    const artifacts = [
      makeArtifact({ type: ArtifactType.TODO }),
      makeArtifact({ type: ArtifactType.DECISION }),
      makeArtifact({ type: ArtifactType.MEMO, status: ArtifactStatus.ARCHIVED }),
    ];
    const sections = buildSections(null, artifacts, new Set(), null);
    expect(sections.map((section) => section.id)).toEqual([ArtifactType.DECISION, ArtifactType.TODO, 'archive']);
  });

  it('caps sections at SECTION_CAP and marks them, expanding only the requested one', () => {
    const memos = Array.from({ length: SECTION_CAP + 3 }, () => makeArtifact({ type: ArtifactType.MEMO }));
    const capped = buildSections(null, memos, new Set(), null)[0];
    expect(capped.capped).toBe(true);
    expect(capped.rows).toHaveLength(SECTION_CAP);
    expect(capped.total).toBe(SECTION_CAP + 3);

    const expanded = buildSections(null, memos, new Set(), ArtifactType.MEMO)[0];
    expect(expanded.capped).toBe(false);
    expect(expanded.rows).toHaveLength(SECTION_CAP + 3);
  });

  it('filters to the chip-selected types and preserves hit order when dates tie', () => {
    const first = makeArtifact({ type: ArtifactType.DECISION });
    const second = makeArtifact({ type: ArtifactType.DECISION });
    const noise = makeArtifact({ type: ArtifactType.TODO });
    const sections = buildSections(
      [hit(second), hit(noise), hit(first)],
      [first, second, noise],
      new Set([ArtifactType.DECISION]),
      null,
    );
    expect(sections).toHaveLength(1);
    expect(sections[0].rows.map((row) => row.artifact.id)).toEqual([second.id, first.id]);
  });

  it('excludes archived artifacts from search results and hides archive while filtering', () => {
    const archived = makeArtifact({ type: ArtifactType.MEMO, status: ArtifactStatus.ARCHIVED });
    expect(buildSections([hit(archived)], [archived], new Set(), null)).toHaveLength(0);
    expect(buildSections(null, [archived], new Set([ArtifactType.MEMO]), null)).toHaveLength(0);
  });

  it('sorts browse rows by updated desc', () => {
    const older = makeArtifact({ type: ArtifactType.MEMO, updated: '2026-08-01T00:00:00.000Z' });
    const newer = makeArtifact({ type: ArtifactType.MEMO, updated: '2026-08-10T00:00:00.000Z' });
    const [section] = buildSections(null, [older, newer], new Set(), null);
    expect(section.rows.map((row) => row.artifact.id)).toEqual([newer.id, older.id]);
  });

  it('sorts browse and search rows by created desc when requested', () => {
    const older = makeArtifact({
      type: ArtifactType.MEMO,
      created: '2026-08-01',
      updated: '2026-08-20T00:00:00.000Z',
    });
    const newer = makeArtifact({
      type: ArtifactType.MEMO,
      created: '2026-08-10',
      updated: '2026-08-11T00:00:00.000Z',
    });

    const [browseSection] = buildSections(null, [older, newer], new Set(), null, 'created');
    const [searchSection] = buildSections([hit(older), hit(newer)], [older, newer], new Set(), null, 'created');

    expect(browseSection.rows.map((row) => row.artifact.id)).toEqual([newer.id, older.id]);
    expect(searchSection.rows.map((row) => row.artifact.id)).toEqual([newer.id, older.id]);
  });

  it('puts artifacts with invalid dates last', () => {
    const invalid = makeArtifact({ type: ArtifactType.MEMO, created: 'unknown' });
    const dated = makeArtifact({ type: ArtifactType.MEMO, created: '2026-08-01' });
    const [section] = buildSections(null, [invalid, dated], new Set(), null, 'created');
    expect(section.rows.map((row) => row.artifact.id)).toEqual([dated.id, invalid.id]);
  });
});

describe('counts', () => {
  it('typeMatchCounts counts non-archived hits per type', () => {
    const artifacts = [
      makeArtifact({ type: ArtifactType.DECISION }),
      makeArtifact({ type: ArtifactType.DECISION }),
      makeArtifact({ type: ArtifactType.DECISION, status: ArtifactStatus.ARCHIVED }),
    ];
    const counts = typeMatchCounts(artifacts.map(hit), artifacts);
    expect(counts.get(ArtifactType.DECISION)).toBe(2);
  });

  it('mastheadCounts summarizes the live vault', () => {
    const artifacts = [
      makeArtifact({ type: ArtifactType.MEMO }),
      makeArtifact({ type: ArtifactType.TODO }),
      makeArtifact({ type: ArtifactType.TODO, status: ArtifactStatus.ARCHIVED }),
    ];
    expect(mastheadCounts(artifacts)).toEqual({ total: 2, typeCount: 2 });
  });
});

describe('project inks', () => {
  it('resolves by project id and title, honoring pinned swatches', () => {
    const project = makeArtifact({
      id: 'proj-1',
      title: 'Release Notes',
      type: ArtifactType.PROJECT,
      swatch: 'teal',
    });
    const inks = buildProjectInkMap([project, makeArtifact({})]);
    expect(projectInkFor('proj-1', inks)).toBe(projectInkFor('Release Notes', inks));
    expect(projectInkFor('proj-1', inks)).toBe('#4E8F8B');
  });

  it('falls back to a stable hash for unknown references', () => {
    const inks = buildProjectInkMap([]);
    expect(projectInkFor('mystery-project', inks)).toBe(projectInkFor('mystery-project', inks));
    expect(projectInkFor('mystery-project', inks)).toMatch(/^#/);
  });
});
