import type { Ref } from 'react';
import { ClipboardCopy, Code, Crosshair, Eye, FolderOpen, History, MoreHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { go, paths } from '../../app/navigation';
import { remove } from '../../data/gateway';
import { invoke } from '../../data/ipc';
import { offerUndo } from '../../data/undo';
import type { TabMode } from '../../store/ui';
import { Button, IconButton, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, SegmentedControl, Tooltip } from '../../ui';
import { ExportMenuItems } from '../export/ExportMenuItems';
import { showPanel } from './commands';

const MODES = [
  { value: 'rendered', label: 'Rendered', icon: Eye },
  { value: 'source', label: 'Source', icon: Code },
] as const;

/** Ask the file list to show a folder or file (it listens for `myos:reveal` with `detail.path`, and opens its column). */
function revealInSidebar(path: string): void {
  window.dispatchEvent(new CustomEvent('myos:reveal', { detail: { path } }));
}

const failed = (fallback: string) => (error: unknown) => toast.error(error instanceof Error ? error.message : fallback);

/** The note's ⋯ menu: where it is, its history, export, and delete. */
function NoteMenu({ path, flush }: { path: string; flush: () => Promise<void> }) {
  const deleteNote = () =>
    void remove(path).then(() => {
      go(paths.today);
      offerUndo(`Deleted ${path}`);
    }, failed('Could not delete the note'));
  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton icon={MoreHorizontal} label="Note actions" size="sm" className="shrink-0" />
      </MenuTrigger>
      <MenuContent align="end">
        <MenuItem icon={Crosshair} onSelect={() => revealInSidebar(path)}>
          Show in the file list
        </MenuItem>
        <MenuItem icon={FolderOpen} onSelect={() => void invoke('shell:reveal', path).catch(failed('Could not show the file'))}>
          Show in file manager
        </MenuItem>
        <MenuItem icon={ClipboardCopy} onSelect={() => void navigator.clipboard.writeText(path).then(() => toast.success('Copied the path'))}>
          Copy path
        </MenuItem>
        <MenuItem icon={History} onSelect={() => showPanel('history')}>
          Show history
        </MenuItem>
        <MenuSeparator />
        <ExportMenuItems path={path} flush={flush} />
        <MenuSeparator />
        <MenuItem icon={Trash2} danger onSelect={deleteNote}>
          Delete note
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

interface NoteHeaderProps {
  path: string;
  mode: TabMode;
  onModeChange: (mode: TabMode) => void;
  /** Where the rendered editor docks its find bar. */
  findSlot: Ref<HTMLDivElement>;
  /** "Saving…" while a save runs, "Not saved" when one failed or waits. */
  saveLabel: string;
  /** Save pending edits now (before an export). */
  flush: () => Promise<void>;
}

/**
 * The quiet bar above a note: its path in mono (each folder shows itself in
 * the file list), find, save state, the Rendered / Source switch (⌘E), and
 * the ⋯ menu.
 * It stays pinned while the note scrolls and fades in focus mode.
 */
export function NoteHeader({ path, mode, onModeChange, findSlot, saveLabel, flush }: NoteHeaderProps) {
  const parts = path.split('/');
  return (
    <div data-focus-hide="reveal" className="sticky top-0 z-sticky flex h-14 items-center gap-2 bg-canvas pt-4">
      <nav aria-label="Path" className="flex min-w-0 flex-1 items-center overflow-hidden font-mono text-xs text-text-tertiary">
        {parts.map((part, index) => {
          const last = index === parts.length - 1;
          const upTo = parts.slice(0, index + 1).join('/');
          return (
            <span key={upTo} className={last ? 'min-w-0 truncate' : 'flex shrink-0 items-center'}>
              {last ? (
                <span aria-current="page" className="px-1 text-text-secondary">
                  {part}
                </span>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="h-6 px-1 font-mono text-xs font-normal text-text-tertiary" onClick={() => revealInSidebar(upTo)}>
                    {part}
                  </Button>
                  <span aria-hidden className="px-1">
                    /
                  </span>
                </>
              )}
            </span>
          );
        })}
      </nav>
      <div ref={findSlot} className="contents" />
      {saveLabel ? (
        <span aria-live="polite" className="shrink-0 text-xs text-text-tertiary">
          {saveLabel}
        </span>
      ) : null}
      <Tooltip content="Rendered or Markdown source" shortcut="mod+e">
        <span className="shrink-0">
          <SegmentedControl aria-label="Show the note" size="sm" options={MODES} value={mode} onValueChange={onModeChange} />
        </span>
      </Tooltip>
      <NoteMenu path={path} flush={flush} />
    </div>
  );
}
