import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProjects, type ProjectWithStats } from '../../hooks/useProjects';
import { useListNavigation } from '../../hooks/useListNavigation';
import { groupProjects, isProjectSort, type ProjectSort } from './projectGroups';
import { ProjectIndex } from './ProjectIndex';
import { ProjectHome } from './ProjectHome';

const SORT_KEY = 'chronicle-projects-sort';
const CLOSED_HIDDEN_KEY = 'chronicle-projects-closed-hidden';

const NO_ITEMS: ProjectWithStats[] = [];
const noop = () => {};

/**
 * /projects is the index of every project; /projects?project=<id> is that
 * project's full-page home. The sidebar owns quick access — this page owns
 * the roster and the artifacts inside a project.
 */
export default function ProjectsPage() {
  const { allProjects } = useProjects();
  const [params, setParams] = useSearchParams();

  const [sort, setSort] = useState<ProjectSort>(() => {
    const stored = localStorage.getItem(SORT_KEY);
    return isProjectSort(stored) ? stored : 'at-risk';
  });
  useEffect(() => {
    localStorage.setItem(SORT_KEY, sort);
  }, [sort]);

  const groups = useMemo(() => groupProjects(allProjects, sort), [allProjects, sort]);
  // Closed projects stay on the roster by default so their home is always one
  // click away; folding the section is a remembered preference.
  const [showClosed, setShowClosed] = useState(
    () => localStorage.getItem(CLOSED_HIDDEN_KEY) !== '1',
  );
  useEffect(() => {
    localStorage.setItem(CLOSED_HIDDEN_KEY, showClosed ? '0' : '1');
  }, [showClosed]);

  // `?create=1` (command palette) focuses the index create row, then the param is stripped.
  const [createFocusToken, setCreateFocusToken] = useState(0);
  useEffect(() => {
    if (params.get('create') !== '1') return;
    setCreateFocusToken((token) => token + 1);
    const next = new URLSearchParams(params);
    next.delete('create');
    setParams(next, { replace: true });
  }, [params, setParams]);

  const selectedId = params.get('project');
  const itemPath = params.get('item');
  const selected = useMemo(
    () => (selectedId ? (allProjects.find((project) => project.id === selectedId) ?? null) : null),
    [allProjects, selectedId],
  );

  const openProject = useCallback(
    (projectId: string) => {
      const next = new URLSearchParams(params);
      next.set('project', projectId);
      next.delete('item');
      setParams(next);
    },
    [params, setParams],
  );

  const closeProject = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete('project');
    next.delete('item');
    setParams(next);
  }, [params, setParams]);

  const selectItem = useCallback(
    (filePath: string) => {
      const next = new URLSearchParams(params);
      next.set('item', filePath);
      setParams(next);
    },
    [params, setParams],
  );

  const closeItem = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete('item');
    setParams(next);
  }, [params, setParams]);

  // Escape walks back up one level at a time: item → project overview →
  // index. j/k live on the index itself.
  const escapeUp = useCallback(() => {
    if (itemPath) closeItem();
    else closeProject();
  }, [itemPath, closeItem, closeProject]);

  useListNavigation({
    items: NO_ITEMS,
    selectedId: selected?.id ?? null,
    getId: (project) => project.id,
    onSelect: noop,
    onEscape: escapeUp,
  });

  if (!selected) {
    return (
      <ProjectIndex
        groups={groups}
        sort={sort}
        onSortChange={setSort}
        showClosed={showClosed}
        onToggleClosed={() => setShowClosed((prev) => !prev)}
        onOpen={openProject}
        createFocusToken={createFocusToken}
      />
    );
  }

  return (
    <ProjectHome
      project={selected}
      itemPath={itemPath}
      onSelectItem={selectItem}
      onCloseItem={closeItem}
    />
  );
}
