import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { FileDown, FileText, History } from 'lucide-react';
import { ArtifactType } from '@shared/types';
import { openedItem } from '../../app/navigation';
import { useDataStore } from '../../data/store';
import type { Command } from '../palette/usePaletteCommands';
import { copyPageAsMarkdown, exportPage } from './export/exportPage';
import { openVersionHistory } from './history/openVersionHistory';
import { exported, failed } from './toasts';

// The palette has no handle on the open editor's pending edits; autosave
// has almost always landed by the time a command runs.
const saved = () => Promise.resolve();

/** The page open in the current URL (a note, task, or project), if any. */
function useOpenPage() {
  const { pathname, search } = useLocation();
  const opened = openedItem(pathname, search);
  return useDataStore((state) => {
    if (!opened) return undefined;
    if ('path' in opened) return state.byPath[opened.path];
    return Object.values(state.byPath).find((item) => item.type === ArtifactType.PROJECT && item.id === opened.projectId);
  });
}

/** Palette commands for files and trust, offered while a page is open. */
export function useFileCommands(): Command[] {
  const page = useOpenPage();
  return useMemo(() => {
    if (!page) return [];
    return [
      {
        id: 'export-page-pdf',
        group: 'Actions',
        label: 'Export page as PDF',
        icon: FileDown,
        keywords: 'print save share pdf',
        run: () =>
          void exportPage(page, 'pdf', saved)
            .then((path) => path && exported(path))
            .catch((error: unknown) => failed(error, 'Could not export as PDF')),
      },
      {
        id: 'copy-page-markdown',
        group: 'Actions',
        label: 'Copy page as Markdown',
        icon: FileText,
        keywords: 'clipboard share md',
        run: () =>
          void copyPageAsMarkdown(page, saved)
            .then(() => toast.success('Copied as Markdown'))
            .catch((error: unknown) => failed(error, 'Could not copy to the clipboard')),
      },
      {
        id: 'version-history',
        group: 'Actions',
        label: 'Version history',
        icon: History,
        keywords: 'restore undo earlier backup snapshot',
        run: () => openVersionHistory(page.filePath),
      },
    ];
  }, [page]);
}
