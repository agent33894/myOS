import { describe, expect, it } from 'vitest';
import type { Artifact } from '../../../types/artifacts';
import { ArtifactType } from '../../../types/artifacts';
import {
  nextPinOrder,
  reorderWrites,
  selectOpenProjects,
  selectSidebarProjects,
} from './sidebarProjectsModel';

const project = (overrides: Omit<Partial<Artifact>, 'status'> & { status?: string }): Artifact =>
  ({
    id: overrides.id ?? 'p',
    title: overrides.title ?? 'Project',
    type: ArtifactType.PROJECT,
    status: 'active',
    tags: [],
    related: [],
    content: '',
    created: '2026-01-01',
    updated: '2026-01-01',
    filePath: `work/projects/${overrides.id ?? 'p'}.md`,
    ...overrides,
  }) as Artifact;

describe('selectOpenProjects', () => {
  it('excludes every closed status, matching the Projects page', () => {
    const open = selectOpenProjects([
      project({ id: 'a', status: 'active' }),
      project({ id: 'b', status: 'draft' }),
      project({ id: 'c', status: 'done' }),
      project({ id: 'd', status: 'cancelled' }),
      project({ id: 'e', status: 'archived' }),
      project({ id: 'f', status: 'completed' }),
    ]);
    expect(open.map((p) => p.id)).toEqual(['a', 'b']);
  });
});

describe('selectSidebarProjects', () => {
  it('sorts pinned by order then title, overflow by updated desc', () => {
    const view = selectSidebarProjects([
      project({ id: 'late', pinned: true, order: 2, title: 'Late' }),
      project({ id: 'early', pinned: true, order: 1, title: 'Early' }),
      project({ id: 'unordered', pinned: true, title: 'Aardvark' }),
      project({ id: 'old', updated: '2026-01-01' }),
      project({ id: 'new', updated: '2026-02-01' }),
    ]);
    expect(view.usingFallback).toBe(false);
    expect(view.pinned.map((p) => p.id)).toEqual(['early', 'late', 'unordered']);
    expect(view.overflow.map((p) => p.id)).toEqual(['new', 'old']);
  });

  it('falls back to the first 8 open projects when nothing is pinned', () => {
    const projects = Array.from({ length: 10 }, (_, i) =>
      project({ id: `p${i}`, title: `P${i}` }),
    );
    const view = selectSidebarProjects(projects);
    expect(view.usingFallback).toBe(true);
    expect(view.pinned).toHaveLength(8);
    expect(view.overflow).toHaveLength(2);
  });
});

describe('nextPinOrder', () => {
  it('appends after the highest existing order', () => {
    expect(nextPinOrder([project({ order: 3 }), project({ order: 7 })])).toBe(8);
    expect(nextPinOrder([])).toBe(1);
  });
});

describe('reorderWrites', () => {
  const pinned = [
    project({ id: 'a', order: 1 }),
    project({ id: 'b', order: 2 }),
    project({ id: 'c', order: 3 }),
  ];

  it('returns only rows whose order changed', () => {
    expect(reorderWrites(pinned, 'c', 'a')).toEqual([
      { id: 'c', order: 1 },
      { id: 'a', order: 2 },
      { id: 'b', order: 3 },
    ]);
    expect(reorderWrites(pinned, 'b', 'b')).toEqual([]);
    expect(reorderWrites(pinned, 'missing', 'a')).toEqual([]);
  });

  it('writes only rows whose normalized order differs from what is stored', () => {
    const gappy = [project({ id: 'a', order: 2 }), project({ id: 'b', order: 9 })];
    // `a` already sits at order 2 after the move, so only `b` is written.
    expect(reorderWrites(gappy, 'b', 'a')).toEqual([{ id: 'b', order: 1 }]);
  });
});
