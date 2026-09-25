import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { ChevronRight, ClipboardCopy, Columns2, FilePlus, FileText, Folder, FolderOpen, FolderPlus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { openNote } from '../../app/navigation';
import { createFolder, createNote, move, moveFolder, remove, removeFolder } from '../../data/gateway';
import { invoke } from '../../data/ipc';
import { offerUndo } from '../../data/undo';
import { useTree } from '../../data/selectors';
import type { TreeFolder } from '../../data/tree';
import { closeTabsUnder, useActivePath } from '../../store/ui';
import {
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Icon,
  Input,
  MenuItem,
  MenuSeparator,
  cn,
  formatShortcut,
} from '../../ui';
import { GitDot } from '../git/useFileGitStatus';
import { SHORTCUTS } from './shortcuts';
import {
  baseName,
  endDraft,
  endRename,
  expandTo,
  FILE_TYPE,
  joinPath,
  parentOf,
  selectRow,
  startDraft,
  startRename,
  toggleFolder,
  useTreeStore,
  type Draft,
  revealInFileList,
} from './layout';

type Kind = 'file' | 'folder';

interface Row {
  kind: Kind;
  path: string;
  name: string;
  depth: number;
  /** Notes below a folder (for the delete question). */
  count: number;
}

const stem = (name: string) => name.replace(/\.md$/i, '');
const failed = (fallback: string) => (error: unknown) => toast.error(error instanceof Error ? error.message : fallback);
const countNotes = (folder: TreeFolder): number => folder.files.length + folder.folders.reduce((sum, child) => sum + countNotes(child), 0);

/** The rows on screen: folders first, then files, children of expanded folders indented under them. */
function flatten(folder: TreeFolder, expanded: Set<string>, depth = 0, rows: Row[] = []): Row[] {
  for (const child of folder.folders) {
    rows.push({ kind: 'folder', path: child.path, name: child.name, depth, count: countNotes(child) });
    if (expanded.has(child.path)) flatten(child, expanded, depth + 1, rows);
  }
  for (const note of folder.files) rows.push({ kind: 'file', path: note.path, name: baseName(note.path), depth, count: 0 });
  return rows;
}

const indent = (depth: number) => ({ paddingLeft: `${depth * 14 + 8}px` });

/** Type a name: a new note or folder, or a new name for an existing one. Enter keeps it, Escape leaves it. */
function NameField({ initial, label, depth, icon, onDone }: { initial: string; label: string; depth: number; icon: typeof FileText; onDone: (name: string | null) => void }) {
  const [value, setValue] = useState(initial);
  const done = useRef(false);
  const finish = (name: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone(name && name.trim() ? name.trim() : null);
  };
  return (
    <div className="flex h-7 items-center gap-2 pr-2" style={indent(depth)}>
      <span className="size-3.5 shrink-0" />
      <Icon icon={icon} size="sm" className="shrink-0 text-text-tertiary" />
      <Input
        autoFocus
        size="sm"
        aria-label={label}
        value={value}
        onFocus={(event) => event.target.setSelectionRange(0, stem(event.target.value).length)}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) finish(value);
          if (event.key === 'Escape') finish(null);
        }}
        onBlur={() => finish(value)}
        className="h-6 px-1.5 font-mono text-xs"
      />
    </div>
  );
}

interface Pending {
  row: Row;
}

/**
 * The open folder as it is on disk. Click to preview a file, double-click to
 * keep its tab; arrows, Enter, F2, Delete, and typing a name work from the
 * keyboard; drag rows onto folders to move them; right-click for the rest.
 */
export function FileTree() {
  const tree = useTree();
  const active = useActivePath();
  const expanded = useTreeStore((state) => state.expanded);
  const selected = useTreeStore((state) => state.selected);
  const renaming = useTreeStore((state) => state.renaming);
  const draft = useTreeStore((state) => state.draft);
  const [menuRow, setMenuRow] = useState<Row | null>(null);
  const [dropFolder, setDropFolder] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Pending | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const hoverTimer = useRef<number | undefined>(undefined);

  const rows = useMemo(() => flatten(tree, expanded), [tree, expanded]);
  const selectedIndex = rows.findIndex((row) => row.path === selected);

  // Breadcrumbs and commands ask for a file or folder with a `myos:reveal` event.
  useEffect(() => {
    const onReveal = (event: Event) => {
      const path = (event as CustomEvent<{ path?: unknown }>).detail?.path;
      if (typeof path === 'string') revealInFileList(path);
    };
    window.addEventListener('myos:reveal', onReveal);
    return () => window.removeEventListener('myos:reveal', onReveal);
  }, []);

  // Reveal the file on screen: open its folders, select it, and scroll to it.
  useEffect(() => {
    if (!active) return;
    expandTo(active);
    selectRow(active);
  }, [active]);

  useEffect(() => {
    if (selectedIndex < 0) return;
    treeRef.current?.querySelector(`[data-row="${selectedIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const open = (row: Row, options: { pin?: boolean; side?: boolean } = {}) => {
    selectRow(row.path);
    if (row.kind === 'folder') toggleFolder(row.path);
    else openNote(row.path, { pin: options.pin, group: options.side ? 1 : undefined });
  };

  const folderFor = (row: Row | null) => (!row ? '' : row.kind === 'folder' ? row.path : parentOf(row.path));

  const create = async ({ parent, kind }: Draft, name: string | null) => {
    endDraft();
    if (!name) return;
    const path = joinPath(parent, name);
    try {
      if (kind === 'folder') {
        const made = await createFolder(path);
        selectRow(made);
      } else {
        const note = await createNote(path);
        openNote(note.path, { pin: true });
      }
    } catch (error) {
      failed(`Could not make ${path}`)(error);
    }
    treeRef.current?.focus();
  };

  const rename = async (row: Row, name: string | null) => {
    endRename();
    treeRef.current?.focus();
    if (!name || name === row.name || (row.kind === 'file' && name === stem(row.name))) return;
    const to = joinPath(parentOf(row.path), row.kind === 'file' && !/\.md$/i.test(name) ? `${name}.md` : name);
    try {
      const moved = row.kind === 'file' ? (await move(row.path, to)).path : await moveFolder(row.path, to);
      selectRow(moved);
    } catch (error) {
      failed(`Could not rename ${row.name}`)(error);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const { row } = deleting;
    setDeleting(null);
    try {
      if (row.kind === 'file') {
        await remove(row.path);
        offerUndo(`Deleted ${row.path}`);
      } else {
        const removed = await removeFolder(row.path);
        toast(`Deleted the folder ${row.path}`, { description: `${removed.length} ${removed.length === 1 ? 'note was' : 'notes were'} copied to history first.` });
      }
      closeTabsUnder(row.path);
      const index = rows.indexOf(row);
      selectRow(rows[index + 1]?.path ?? rows[index - 1]?.path ?? null);
    } catch (error) {
      failed(`Could not delete ${row.path}`)(error);
    }
    treeRef.current?.focus();
  };

  // ---- Drag and drop ---------------------------------------------------------

  const moveInto = async (source: { path: string; kind: Kind }, folder: string) => {
    if (parentOf(source.path) === folder) return;
    if (source.kind === 'folder' && (folder === source.path || folder.startsWith(`${source.path}/`))) {
      toast.error('A folder cannot go inside itself.');
      return;
    }
    const to = joinPath(folder, baseName(source.path));
    try {
      const moved = source.kind === 'file' ? (await move(source.path, to)).path : await moveFolder(source.path, to);
      if (folder) expandTo(`${folder}/x`);
      selectRow(moved);
    } catch (error) {
      failed(`Could not move ${source.path}`)(error);
    }
  };

  const onDragStart = (event: DragEvent, row: Row) => {
    event.dataTransfer.setData(FILE_TYPE, JSON.stringify({ path: row.path, kind: row.kind }));
    event.dataTransfer.setData('text/plain', row.path);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (event: DragEvent, row: Row | null) => {
    if (!event.dataTransfer.types.includes(FILE_TYPE)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    const folder = folderFor(row);
    if (folder !== dropFolder) {
      setDropFolder(folder);
      window.clearTimeout(hoverTimer.current);
      // Hovering a closed folder for a moment opens it.
      if (row?.kind === 'folder' && !expanded.has(row.path)) hoverTimer.current = window.setTimeout(() => toggleFolder(row.path, true), 700);
    }
  };

  const onDrop = (event: DragEvent, row: Row | null) => {
    const raw = event.dataTransfer.getData(FILE_TYPE);
    window.clearTimeout(hoverTimer.current);
    setDropFolder(null);
    if (!raw) return;
    event.preventDefault();
    event.stopPropagation();
    void moveInto(JSON.parse(raw) as { path: string; kind: Kind }, folderFor(row));
  };

  // ---- Keyboard ----------------------------------------------------------------

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const row = rows[selectedIndex];
    const go = (index: number) => {
      const next = rows[Math.max(0, Math.min(rows.length - 1, index))];
      if (next) selectRow(next.path);
    };
    const modifier = event.metaKey || event.ctrlKey;
    const handled = (() => {
      switch (event.key) {
        case 'ArrowDown':
          go(selectedIndex < 0 ? 0 : selectedIndex + 1);
          return true;
        case 'ArrowUp':
          go(selectedIndex < 0 ? rows.length - 1 : selectedIndex - 1);
          return true;
        case 'Home':
          go(0);
          return true;
        case 'End':
          go(rows.length - 1);
          return true;
        case 'ArrowRight':
          if (row?.kind === 'folder') {
            if (!expanded.has(row.path)) toggleFolder(row.path, true);
            else go(selectedIndex + 1);
          }
          return true;
        case 'ArrowLeft':
          if (row?.kind === 'folder' && expanded.has(row.path)) toggleFolder(row.path, false);
          else if (row && parentOf(row.path)) selectRow(parentOf(row.path));
          return true;
        case 'Enter':
          if (row) open(row, { pin: true, side: modifier });
          return true;
        case 'F2':
          if (row) startRename(row.path);
          return true;
        case 'Delete':
          if (row) setDeleting({ row });
          return true;
        case 'Backspace':
          if (row && modifier) setDeleting({ row });
          return Boolean(row && modifier);
        default:
          break;
      }
      // Type a name to jump to it.
      if (event.key.length !== 1 || modifier || event.altKey || event.key === ' ' && !typed.current.text) return false;
      const now = Date.now();
      const text = (now - typed.current.at > 700 ? '' : typed.current.text) + event.key.toLowerCase();
      typed.current = { text, at: now };
      const from = text.length === 1 ? selectedIndex + 1 : Math.max(0, selectedIndex);
      const order = [...rows.slice(from), ...rows.slice(0, from)];
      const match = order.find((candidate) => candidate.name.toLowerCase().startsWith(text));
      if (match) selectRow(match.path);
      return true;
    })();
    if (handled) event.preventDefault();
  };

  const draftRow = draft ? (
    <NameField
      key="draft"
      initial=""
      label={draft.kind === 'folder' ? 'New folder name' : 'New note name'}
      depth={draft.parent ? draft.parent.split('/').length : 0}
      icon={draft.kind === 'folder' ? Folder : FileText}
      onDone={(name) => void create(draft, name)}
    />
  ) : null;

  if (rows.length === 0 && !draft) {
    return (
      <div className="flex flex-col items-start gap-3 px-2 py-2">
        <p className="text-sm text-text-secondary">This folder has no Markdown files yet.</p>
        <Button size="sm" leadingIcon={FilePlus} onClick={() => startDraft('', 'note')}>
          New note
        </Button>
      </div>
    );
  }

  const menuFolder = folderFor(menuRow);

  return (
    <>
      <ContextMenu onOpenChange={(open) => !open && setTimeout(() => treeRef.current?.focus({ preventScroll: true }), 0)}>
        <ContextMenuTrigger asChild>
          <div
            ref={treeRef}
            role="tree"
            aria-label="Files"
            tabIndex={0}
            aria-activedescendant={selectedIndex >= 0 ? `tree-row-${selectedIndex}` : undefined}
            onKeyDown={onKeyDown}
            onContextMenu={(event) => {
              // A row sets itself first; a click on empty space means the folder's top.
              if (!(event.target as HTMLElement).closest('[role="treeitem"]')) setMenuRow(null);
            }}
            onDragOver={(event) => onDragOver(event, null)}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropFolder(null);
            }}
            onDrop={(event) => onDrop(event, null)}
            className={cn(
              'group/tree flex min-h-full flex-col rounded-md pb-8 outline-none transition-colors duration-fast',
              dropFolder === '' && 'bg-accent-soft',
            )}
          >
            {draft?.parent === '' ? draftRow : null}
            {rows.map((row, index) => {
              const isActive = row.path === active;
              const isSelected = index === selectedIndex;
              const isOpen = row.kind === 'folder' && expanded.has(row.path);
              if (row.path === renaming) {
                return (
                  <NameField
                    key={row.path}
                    initial={row.kind === 'file' ? stem(row.name) : row.name}
                    label={`New name for ${row.name}`}
                    depth={row.depth}
                    icon={row.kind === 'folder' ? Folder : FileText}
                    onDone={(name) => void rename(row, name)}
                  />
                );
              }
              return (
                <div key={row.path} className="contents">
                  <div
                    id={`tree-row-${index}`}
                    data-row={index}
                    role="treeitem"
                    aria-level={row.depth + 1}
                    aria-selected={isSelected}
                    aria-expanded={row.kind === 'folder' ? isOpen : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    title={row.path}
                    draggable
                    onDragStart={(event) => onDragStart(event, row)}
                    onDragOver={(event) => onDragOver(event, row)}
                    onDrop={(event) => onDrop(event, row)}
                    onClick={() => open(row)}
                    onDoubleClick={() => row.kind === 'file' && open(row, { pin: true })}
                    onAuxClick={(event) => event.button === 1 && row.kind === 'file' && open(row, { side: true, pin: true })}
                    onContextMenu={() => {
                      selectRow(row.path);
                      setMenuRow(row);
                    }}
                    style={indent(row.depth)}
                    className={cn(
                      'flex h-7 shrink-0 cursor-default select-none items-center gap-2 rounded-md pr-2 text-sm transition-colors duration-fast',
                      isActive ? 'bg-sheet font-medium text-text shadow-raised' : 'text-text-secondary hover:bg-text/5 hover:text-text',
                      isSelected && !isActive && 'bg-text/5 text-text',
                      isSelected && 'group-focus-visible/tree:outline group-focus-visible/tree:outline-2 group-focus-visible/tree:-outline-offset-2 group-focus-visible/tree:outline-focus',
                      row.kind === 'folder' && dropFolder === row.path && 'bg-accent-soft text-text',
                    )}
                  >
                    {row.kind === 'folder' ? (
                      <>
                        <Icon icon={ChevronRight} size="sm" className={cn('shrink-0 text-text-tertiary transition-transform duration-fast', isOpen && 'rotate-90')} />
                        <Icon icon={isOpen ? FolderOpen : Folder} size="sm" className="shrink-0 text-text-tertiary" />
                        <span className="truncate">{row.name}</span>
                      </>
                    ) : (
                      <>
                        <span className="size-3.5 shrink-0" />
                        <Icon icon={FileText} size="sm" className={cn('shrink-0', isActive ? 'text-accent-text' : 'text-text-tertiary')} />
                        <span className="truncate">{stem(row.name)}</span>
                        <GitDot path={row.path} className="ml-auto" />
                      </>
                    )}
                  </div>
                  {row.kind === 'folder' && draft?.parent === row.path ? draftRow : null}
                </div>
              );
            })}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <MenuItem icon={FilePlus} shortcut={SHORTCUTS.newNote} onSelect={() => startDraft(menuFolder, 'note')}>
            New note
          </MenuItem>
          <MenuItem icon={FolderPlus} onSelect={() => startDraft(menuFolder, 'folder')}>
            New folder
          </MenuItem>
          {menuRow ? (
            <>
              <MenuSeparator />
              {menuRow.kind === 'file' ? (
                <MenuItem icon={Columns2} onSelect={() => open(menuRow, { side: true, pin: true })}>
                  Open to the side
                </MenuItem>
              ) : null}
              <MenuItem icon={Pencil} shortcut="f2" onSelect={() => startRename(menuRow.path)}>
                Rename
              </MenuItem>
              <MenuItem icon={Trash2} shortcut="delete" danger onSelect={() => setDeleting({ row: menuRow })}>
                Delete
              </MenuItem>
              <MenuSeparator />
              <MenuItem
                icon={ClipboardCopy}
                onSelect={() => void navigator.clipboard.writeText(menuRow.path).then(() => toast('Copied the path'), failed('Could not copy'))}
              >
                Copy path
              </MenuItem>
            </>
          ) : (
            <MenuSeparator />
          )}
          <MenuItem icon={FolderOpen} onSelect={() => void invoke('shell:reveal', menuRow?.path ?? '.').catch(failed('Could not open the file manager'))}>
            Reveal in file manager
          </MenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{deleting?.row.kind === 'folder' ? `Delete the folder “${deleting.row.name}”?` : `Delete “${deleting ? stem(deleting.row.name) : ''}”?`}</DialogTitle>
            <DialogDescription>
              {deleting?.row.kind === 'folder'
                ? `It has ${deleting.row.count} ${deleting.row.count === 1 ? 'note' : 'notes'}. Each one is copied to myOS Next’s local history first, and the folder goes to the trash.`
                : `A local copy stays in myOS Next’s history for thirty days, and ${formatShortcut(SHORTCUTS.undo)} puts it back.`}
            </DialogDescription>
          </DialogHeader>
          <p className="truncate font-mono text-xs text-text-tertiary">{deleting?.row.path}</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" autoFocus leadingIcon={Trash2} onClick={() => void confirmDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
