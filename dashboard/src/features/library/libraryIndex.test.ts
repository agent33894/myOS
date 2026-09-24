import { describe, expect, it } from 'vitest';
import { ArtifactStatus, ArtifactType, type ArtifactSummary } from '@shared/types';
import {
  buildProjectInkMap,
  buildSections,
  mastheadCounts,
  projectInkFor,
  SECTION_CAP,
  typeMatchCounts,
} from './libraryIndex';

let seq = 0;
function makeArtifact(overrides: Partial<ArtifactSummary>): ArtifactSummary {
  seq += 1;
  return {
    id: `artifact-${seq}`,
    title: `ArtifactSummary ${seq}`,
    type: ArtifactType.MEMO,
    tags: [],
    status: 'active',
    related: [],
    content: '',
    created: '2026-08-01',
    updated: '2026-08-01T00:00:00.000Z',
    filePath: `vault/work/memos/artifact-${seq}.md`,
    ...overrides,
  } as ArtifactSummary;
}

const hit = (artifact: ArtifactSummary) => ({ artifact, score: 1 });

describe('buildSections', () => {
  it('defaults to one uncapped list, newest created first, with a trailing archive section', () => {
    const older = makeArtifact({ type: ArtifactType.TODO, created: '2026-08-01', updated: '2026-08-30T00:00:00.000Z' });
    const newer = makeArtifact({ type: ArtifactType.DECISION, created: '2026-08-05' });
    const memos = Array.from({ length: SECTION_CAP + 2 }, () => makeArtifact({ created: '2026-07-01' }));
    const archived = makeArtifact({ status: ArtifactStatus.ARCHIVED });
    const sections = buildSections(null, [older, ...memos, newer, archived]);
    expect(sections.map((section) => section.id)).toEqual(['all', 'archive']);
    expect(sections[0].capped).toBe(false);
    expect(sections[0].rows).toHaveLength(SECTION_CAP + 4);
    expect(sections[0].rows.slice(0, 2).map((row) => row.artifact.id)).toEqual([newer.id, older.id]);
  });

  it('filters the ungrouped list to chip-selected types', () => {
    const decision = makeArtifact({ type: ArtifactType.DECISION });
    const todo = makeArtifact({ type: ArtifactType.TODO });
    const sections = buildSections(null, [decision, todo], { types: new Set([ArtifactType.TODO]) });
    expect(sections).toHaveLength(1);
    expect(sections[0].rows.map((row) => row.artifact.id)).toEqual([todo.id]);
  });

  it('groups browse mode by type in editorial order with a trailing archive section', () => {
    const artifacts = [
      makeArtifact({ type: ArtifactType.TODO }),
      makeArtifact({ type: ArtifactType.DECISION }),
      makeArtifact({ type: ArtifactType.MEMO, status: ArtifactStatus.ARCHIVED }),
    ];
    const sections = buildSections(null, artifacts, { grouping: 'type' });
    expect(sections.map((section) => section.id)).toEqual([ArtifactType.DECISION, ArtifactType.TODO, 'archive']);
  });

  it('caps sections at SECTION_CAP and marks them, expanding only the requested one', () => {
    const memos = Array.from({ length: SECTION_CAP + 3 }, () => makeArtifact({ type: ArtifactType.MEMO }));
    const capped = buildSections(null, memos, { grouping: 'type' })[0];
    expect(capped.capped).toBe(true);
    expect(capped.rows).toHaveLength(SECTION_CAP);
    expect(capped.total).toBe(SECTION_CAP + 3);

    const expanded = buildSections(null, memos, { grouping: 'type', expanded: ArtifactType.MEMO })[0];
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
      { types: new Set([ArtifactType.DECISION]), grouping: 'type' },
    );
    expect(sections).toHaveLength(1);
    expect(sections[0].rows.map((row) => row.artifact.id)).toEqual([second.id, first.id]);
  });

  it('excludes archived artifacts from search results and hides archive while filtering', () => {
    const archived = makeArtifact({ type: ArtifactType.MEMO, status: ArtifactStatus.ARCHIVED });
    expect(buildSections([hit(archived)], [archived])).toHaveLength(0);
    expect(buildSections(null, [archived], { types: new Set([ArtifactType.MEMO]) })).toHaveLength(0);
  });

  it('sorts browse rows by updated desc when requested', () => {
    const older = makeArtifact({ type: ArtifactType.MEMO, updated: '2026-08-01T00:00:00.000Z' });
    const newer = makeArtifact({ type: ArtifactType.MEMO, updated: '2026-08-10T00:00:00.000Z' });
    const [section] = buildSections(null, [older, newer], { sort: 'updated' });
    expect(section.rows.map((row) => row.artifact.id)).toEqual([newer.id, older.id]);
  });

  it('sorts browse and search rows by created desc by default', () => {
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

    const [browseSection] = buildSections(null, [older, newer]);
    const [searchSection] = buildSections([hit(older), hit(newer)], [older, newer]);

    expect(browseSection.rows.map((row) => row.artifact.id)).toEqual([newer.id, older.id]);
    expect(searchSection.rows.map((row) => row.artifact.id)).toEqual([newer.id, older.id]);
  });

  it('puts artifacts with invalid dates last', () => {
    const invalid = makeArtifact({ type: ArtifactType.MEMO, created: 'unknown' });
    const dated = makeArtifact({ type: ArtifactType.MEMO, created: '2026-08-01' });
    const [section] = buildSections(null, [invalid, dated]);
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
