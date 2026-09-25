import type { NoteSummary } from '@shared/spec';

export interface TreeFolder {
  /** Empty for the top of the open folder. */
  path: string;
  name: string;
  folders: TreeFolder[];
  files: NoteSummary[];
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** The folder tree: folders first, then files, each in natural name order. */
export function buildTree(folders: readonly string[], notes: readonly NoteSummary[]): TreeFolder {
  const top: TreeFolder = { path: '', name: '', folders: [], files: [] };
  const byPath = new Map<string, TreeFolder>([['', top]]);
  const folderAt = (path: string): TreeFolder => {
    const existing = byPath.get(path);
    if (existing) return existing;
    const cut = path.lastIndexOf('/');
    const folder: TreeFolder = { path, name: path.slice(cut + 1), folders: [], files: [] };
    byPath.set(path, folder);
    folderAt(cut < 0 ? '' : path.slice(0, cut)).folders.push(folder);
    return folder;
  };
  for (const path of folders) folderAt(path);
  for (const note of notes) folderAt(note.path.includes('/') ? note.path.slice(0, note.path.lastIndexOf('/')) : '').files.push(note);
  for (const folder of byPath.values()) {
    folder.folders.sort((a, b) => collator.compare(a.name, b.name));
    folder.files.sort((a, b) => collator.compare(a.path, b.path));
  }
  return top;
}
