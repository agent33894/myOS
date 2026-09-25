import type { Ref } from 'react';
import { Code, Eye } from 'lucide-react';
import { updateSettings, useSettings } from '../../store/settings';
import type { TabMode } from '../../store/ui';
import { Button, SegmentedControl, Tooltip } from '../../ui';

const MODES = [
  { value: 'rendered', label: 'Rendered', icon: Eye },
  { value: 'source', label: 'Source', icon: Code },
] as const;

/**
 * Ask the file list to show a folder or file. The sidebar listens for this
 * event (`myos:reveal`, `detail.path`); the left column is opened if it was folded.
 */
export function revealInSidebar(path: string): void {
  const { sidebar } = useSettings.getState();
  if (sidebar.left.collapsed) void updateSettings({ sidebar: { ...sidebar, left: { ...sidebar.left, collapsed: false } } });
  window.dispatchEvent(new CustomEvent('myos:reveal', { detail: { path } }));
}

interface NoteHeaderProps {
  path: string;
  mode: TabMode;
  onModeChange: (mode: TabMode) => void;
  /** Where the rendered editor docks its find bar. */
  findSlot: Ref<HTMLDivElement>;
  /** "Saving…" while a save runs, "Not saved" when one failed or waits. */
  saveLabel: string;
}

/**
 * The quiet bar above a note: its path in mono (each folder shows itself in
 * the file list), find, save state, and the Rendered / Source switch (⌘E).
 * It stays pinned while the note scrolls and fades in focus mode.
 */
export function NoteHeader({ path, mode, onModeChange, findSlot, saveLabel }: NoteHeaderProps) {
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
    </div>
  );
}
