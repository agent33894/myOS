import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { openedItem } from '../../app/navigation';
import { sectionOf, type SectionRoute } from '../../app/routes';
import { useDataStore } from '../../data/store';
import { useUIStore } from '../../store/ui';

// Switching sections and back restores your place (selection, open note, project).
const lastUrlBySection = new Map<string, string>();

export const sectionUrl = (section: SectionRoute) => lastUrlBySection.get(section.id) ?? section.href;

/** Remember the last URL per section and the items the user opens, for the palette's Recent group. */
export function useNavigationMemory(): void {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const section = sectionOf(pathname);
    if (section) lastUrlBySection.set(section.id, `${pathname}${search}`);

    const opened = openedItem(pathname, search);
    if (!opened) return;
    // The palette drops recent paths that no longer exist, so these are not checked here.
    const path =
      'path' in opened
        ? opened.path
        : Object.values(useDataStore.getState().byPath).find(
            (item) => item.type === 'project' && item.id === opened.projectId,
          )?.filePath;
    if (path) useUIStore.getState().addRecent(path);
  }, [pathname, search]);
}
