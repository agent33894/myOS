import { openNote } from '../../app/navigation';
import { useUIStore } from '../../store/ui';

/** Open a note in the other group (⌘-click a link), keeping the current note where it is. */
export function openToSide(path: string): void {
  const { focusedGroup } = useUIStore.getState();
  openNote(path, { pin: true, group: focusedGroup === 0 ? 1 : 0 });
}

/** Open a note from a link: in its tab, or beside this one when ⌘ (Ctrl) is held. */
export const openFromLink = (path: string, beside: boolean) => (beside ? openToSide(path) : openNote(path));
