import { toast } from 'sonner';
import type { ViewKind } from '@shared/query';
import type { PinnedView } from '@shared/settings';
import { go, paths, toViewUrl } from '../../app/navigation';
import { updateSettings, useSettings } from '../../store/settings';
import { viewId } from './queryText';

/*
 * Saved views live in Settings (`pinnedViews`) and show in the sidebar.
 * They never write to the folder.
 */

const views = () => useSettings.getState().pinnedViews;

/** Save a view under `name`, pin it to the sidebar, and show it. */
export async function saveView(name: string, query: string, kind: ViewKind): Promise<PinnedView> {
  const view: PinnedView = { id: viewId(name, views().map((entry) => entry.id)), name: name.trim(), query: query.trim(), kind };
  await updateSettings({ pinnedViews: [...views(), view] });
  go(toViewUrl(view.id));
  toast.success(`Saved “${view.name}” to the sidebar`);
  return view;
}

/** Change a saved view's name or text. */
export function updateView(id: string, change: Partial<Pick<PinnedView, 'name' | 'query'>>): Promise<void> {
  return updateSettings({ pinnedViews: views().map((entry) => (entry.id === id ? { ...entry, ...change } : entry)) });
}

/** Remove a saved view from the sidebar; the toast puts it back. */
export async function removeView(id: string): Promise<void> {
  const before = views();
  const index = before.findIndex((entry) => entry.id === id);
  if (index < 0) return;
  const removed = before[index];
  await updateSettings({ pinnedViews: before.filter((entry) => entry.id !== id) });
  go(paths.tasks);
  toast.success(`Removed “${removed.name}”`, {
    action: {
      label: 'Undo',
      onClick: () => {
        const now = views().filter((entry) => entry.id !== id);
        void updateSettings({ pinnedViews: [...now.slice(0, index), removed, ...now.slice(index)] }).then(() => go(toViewUrl(id)));
      },
    },
  });
}
