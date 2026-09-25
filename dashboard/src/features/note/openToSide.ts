import { openNote } from '../../app/navigation';
import { useSettings } from '../../store/settings';
import { setSplit, useUIStore } from '../../store/ui';

/** Open a note beside the one on screen (⌘-click a link), keeping the current note where it is. */
export function openToSide(path: string): void {
  const { tabs, activeTab } = useUIStore.getState();
  if (activeTab === null || tabs[activeTab]?.path === path) {
    openNote(path);
    return;
  }
  let index = tabs.findIndex((tab) => tab.path === path);
  if (index < 0) {
    index = tabs.length;
    useUIStore.setState({ tabs: [...tabs, { path, mode: useSettings.getState().editorMode }] });
  }
  setSplit(index);
}

/** Open a note from a link: in its tab, or beside this one when ⌘ (Ctrl) is held. */
export const openFromLink = (path: string, beside: boolean) => (beside ? openToSide(path) : openNote(path));
