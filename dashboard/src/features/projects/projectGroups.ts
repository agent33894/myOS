import type { ProjectWithStats } from '../../hooks/useProjects';

export interface ProjectGroups {
  active: ProjectWithStats[];
  dormant: ProjectWithStats[];
  closed: ProjectWithStats[];
}

export type ProjectSort = 'at-risk' | 'activity' | 'progress' | 'title';

export const PROJECT_SORT_LABELS: Record<ProjectSort, string> = {
  'at-risk': 'At-risk first',
  activity: 'Activity',
  progress: 'Progress',
  title: 'Title',
};

export function isProjectSort(value: string | null): value is ProjectSort {
  return value !== null && value in PROJECT_SORT_LABELS;
}

const byActivityDesc = (a: ProjectWithStats, b: ProjectWithStats) =>
  (b.lastActivity ?? '').localeCompare(a.lastActivity ?? '');

/** Projects without tasks sort after 100%-complete ones: nothing left to move. */
const byProgressAsc = (a: ProjectWithStats, b: ProjectWithStats) =>
  (a.todoProgress?.percentage ?? 101) - (b.todoProgress?.percentage ?? 101) ||
  byActivityDesc(a, b);

const COMPARATORS: Record<ProjectSort, (a: ProjectWithStats, b: ProjectWithStats) => number> = {
  'at-risk': (a, b) =>
    Number(b.health === 'at-risk') - Number(a.health === 'at-risk') || byActivityDesc(a, b),
  activity: byActivityDesc,
  progress: byProgressAsc,
  title: (a, b) => a.title.localeCompare(b.title),
};

/** Active, dormant, and closed (done, cancelled, archived) projects; the sort orders within each group. */
export function groupProjects(
  projects: ProjectWithStats[],
  sort: ProjectSort = 'at-risk',
): ProjectGroups {
  const compare = COMPARATORS[sort];
  const open = projects.filter((p) => !p.isClosed);
  return {
    active: open.filter((p) => p.health !== 'dormant').sort(compare),
    dormant: open.filter((p) => p.health === 'dormant').sort(compare),
    closed: projects.filter((p) => p.isClosed).sort(compare),
  };
}
