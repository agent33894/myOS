import { useMemo } from 'react';
import { formatLocalDate } from '@shared/date';
import { ArtifactType, type Artifact } from '@shared/types';
import { create, patch } from '../../data/gateway';
import type { ProjectWithStats } from '../../data/projects';
import { useDataStore } from '../../data/store';
import { useProjects } from '../../data/selectors';
import { projectGroup } from './projectStatus';

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Whether the project's next step is already one of its open tasks. */
export const nextIsTask = (project: ProjectWithStats) =>
  Boolean(project.next) && project.openTodos.some((task) => same(task.title, project.next!));

/** Active projects whose next step is written down but not yet a task, by title. */
export function useNextSteps(): ProjectWithStats[] {
  const projects = useProjects();
  return useMemo(
    () =>
      projects
        .filter((project) => project.next?.trim() && projectGroup(project.status) === 'active' && !nextIsTask(project))
        .sort((a, b) => a.title.localeCompare(b.title)),
    [projects],
  );
}

export const setNextStep = (project: Pick<Artifact, 'filePath' | 'title'>, next: string | null) =>
  patch(project.filePath, { next: next?.trim() || null }, next?.trim() ? `Next step for “${project.title}”` : `Clear the next step of “${project.title}”`);

const plannedToday = (today: string) =>
  Object.values(useDataStore.getState().byPath).filter((item) => item.type === ArtifactType.TODO && item.planned === today);

/**
 * Turn a project's next step into a task in that project. With `plan`, it
 * joins the end of today's plan. The next step stays written on the project
 * until you change it; it just stops showing as a suggestion.
 */
export function makeTaskFromNext(project: ProjectWithStats, { plan = false } = {}): Promise<Artifact> {
  const today = formatLocalDate();
  const order = plan ? Math.max(0, ...plannedToday(today).map((item) => item.order ?? 0)) + 1 : undefined;
  return create(
    {
      type: ArtifactType.TODO,
      title: project.next!.trim(),
      project: project.id,
      domain: project.domain,
      ...(plan ? { planned: today, order } : {}),
    },
    `Make “${project.next}” a task`,
  );
}
