import { useState } from 'react';
import { ChevronRight, FileText, Folder } from 'lucide-react';
import { openNote } from '../../app/navigation';
import { useTree } from '../../data/selectors';
import type { TreeFolder } from '../../data/tree';
import { useActivePath } from '../../store/ui';
import { Button, Icon, cn, formatShortcut } from '../../ui';
import { useFileGitStatus } from '../git/useFileGitStatus';

/** A quiet dot for a file with uncommitted changes. */
function GitDot({ path }: { path: string }) {
  const change = useFileGitStatus(path);
  return change ? <span aria-label={`Git: ${change}`} className="ml-auto size-1.5 shrink-0 rounded-full bg-accent" /> : null;
}

const row = 'h-7 w-full justify-start gap-1.5 rounded-md px-1.5 text-sm font-normal';

function FolderRows({ folder, depth, open, toggle, active }: { folder: TreeFolder; depth: number; open: Set<string>; toggle: (path: string) => void; active: string | null }) {
  const indent = { paddingLeft: `${depth * 12 + 6}px` };
  return (
    <>
      {folder.folders.map((child) => (
        <div key={child.path} role="treeitem" aria-expanded={open.has(child.path)}>
          <Button variant="ghost" className={cn(row, 'text-text-secondary')} style={indent} onClick={() => toggle(child.path)}>
            <Icon icon={ChevronRight} size="sm" className={cn('shrink-0 transition-transform duration-fast', open.has(child.path) && 'rotate-90')} />
            <Icon icon={Folder} size="sm" className="shrink-0 text-text-tertiary" />
            <span className="truncate">{child.name}</span>
          </Button>
          {open.has(child.path) ? (
            <div role="group">
              <FolderRows folder={child} depth={depth + 1} open={open} toggle={toggle} active={active} />
            </div>
          ) : null}
        </div>
      ))}
      {folder.files.map((note) => (
        <Button
          key={note.path}
          role="treeitem"
          variant="ghost"
          aria-current={note.path === active ? 'page' : undefined}
          title={note.path}
          className={cn(row, note.path === active ? 'bg-text/5 text-text' : 'text-text-secondary')}
          style={{ paddingLeft: `${depth * 12 + 24}px` }}
          onClick={() => openNote(note.path)}
        >
          <Icon icon={FileText} size="sm" className="shrink-0 text-text-tertiary" />
          <span className="truncate">{note.path.slice(note.path.lastIndexOf('/') + 1).replace(/\.md$/i, '')}</span>
          <GitDot path={note.path} />
        </Button>
      ))}
    </>
  );
}

/** The open folder as it is on disk: folders, then Markdown files. */
export function FileTree() {
  const tree = useTree();
  const active = useActivePath();
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const toggle = (path: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(path)) next.add(path);
      return next;
    });
  if (tree.folders.length === 0 && tree.files.length === 0) {
    return <p className="px-2 py-1 text-sm text-text-tertiary">This folder has no Markdown files yet. Press {formatShortcut('mod+n')} to capture a first line.</p>;
  }
  return (
    <div role="tree" aria-label="Files" className="flex flex-col">
      <FolderRows folder={tree} depth={0} open={open} toggle={toggle} active={active} />
    </div>
  );
}
