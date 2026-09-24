import { describe, expect, it } from 'vitest';
import type { ArtifactSummary } from '@shared/types';
import { sidebarProjects } from './projectActions';

const project = (id: string, extra: Partial<Omit<ArtifactSummary, 'status'>> & { status?: string } = {}) =>
  ({ id, title: id, type: 'project', status: 'active', filePath: `${id}.md`, ...extra }) as ArtifactSummary;

describe('sidebarProjects', () => {
  it('lists open projects, pinned first in pin order, then alphabetically', () => {
    const list = sidebarProjects([
      project('zeta'),
      project('pinned-late', { pinned: true, order: 2 }),
      project('alpha'),
      project('pinned-early', { pinned: true, order: 1 }),
      project('done', { status: 'done' }),
      project('archived', { status: 'archived' }),
      { ...project('task'), type: 'todo' } as ArtifactSummary,
    ]);
    expect(list.map((item) => item.id)).toEqual(['pinned-early', 'pinned-late', 'alpha', 'zeta']);
  });
});
