import type { Artifact } from '../../types/artifacts';

interface WorkbenchLists {
  openTodos: Artifact[];
  doneTodos: Artifact[];
  materials: Artifact[];
}

/**
 * The workbench's `?item=` param carries a file path; the artifact it names
 * must actually belong to the project or the selection is ignored (stale
 * deep link, task unlinked from the project, deleted file). Falling back to
 * null lands on the overview rather than an error state.
 */
export function resolveWorkbenchItem(
  lists: WorkbenchLists,
  itemPath: string | null | undefined,
): Artifact | null {
  if (!itemPath) return null;
  const pools = [lists.openTodos, lists.doneTodos, lists.materials];
  for (const pool of pools) {
    const match = pool.find((artifact) => artifact.filePath === itemPath);
    if (match) return match;
  }
  return null;
}
