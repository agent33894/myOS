import { Suspense, useEffect, useState } from 'react';
import { FileQuestion } from 'lucide-react';
import { useDocument } from '../../data/useDocument';
import { Editor, SourceEditor } from '../../editor';
import { useCaretLines } from '../../editor/bridge';
import { hasPrimaryModifier } from '../../lib/platform';
import { useSettings } from '../../store/settings';
import { closeTab, setTabMode, useActivePath, useUIStore, type TabMode } from '../../store/ui';
import { Button, EmptyState, LoadingState, PageLayout } from '../../ui';
import { ConflictBanner } from './ConflictBanner';
import { NoteHeader } from './NoteHeader';
import { countWords, useNoteStatus } from './noteStatus';
import { useTaskToggle } from './useTaskToggle';

interface NoteTabProps {
  path: string;
  mode: TabMode;
  /** A missing file opens empty and is made on the first edit (today's daily note). */
  createOnWrite?: boolean;
}

const stem = (path: string) => path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/i, '');

/** A body that opens with its own `# Heading` already has a title on the page. */
const startsWithTitle = (content: string) => /^#\s+\S/.test(content);

/** Switch this tab between rendered and source. */
function switchMode(path: string, mode?: TabMode) {
  const { tabs } = useUIStore.getState();
  const index = tabs.findIndex((tab) => tab.path === path);
  if (index >= 0) setTabMode(index, mode ?? (tabs[index].mode === 'source' ? 'rendered' : 'source'));
}

/**
 * One note in a tab: a quiet header with the path, the body rendered or as
 * Markdown source, saving quietly as you type. A change on disk while there
 * are unsaved edits raises a banner instead of overwriting either side.
 *
 * The title: a note whose body starts with `# Heading` shows that heading,
 * edited in place like any text. Otherwise the page shows the note's title
 * (frontmatter `title`, else the file name) above the body, read-only; the
 * file is renamed from the file list. Nothing is ever added to the file to
 * make a title.
 */
export function NoteTab({ path, mode, createOnWrite = false }: NoteTabProps) {
  const doc = useDocument(path, { createOnWrite });
  const [findSlot, setFindSlot] = useState<HTMLDivElement | null>(null);
  const active = useActivePath() === path;
  const vimKeys = useSettings((state) => state.vimKeys);
  const tasks = useTaskToggle(path, doc);

  // After a mode switch, the new editor starts on the line the caret was on.
  const [shownMode, setShownMode] = useState(mode);
  const [startLine, setStartLine] = useState<number | undefined>(undefined);
  if (shownMode !== mode) {
    setShownMode(mode);
    setStartLine(useCaretLines.getState()[path] ?? 0);
  }

  useEffect(() => {
    if (!active) return;
    const content = doc.content ?? '';
    useNoteStatus.setState({ path, content, words: countWords(content), saving: doc.saving, dirty: doc.dirty, saved: doc.lastSaved !== null });
  }, [active, path, doc.content, doc.saving, doc.dirty, doc.lastSaved]);

  // ⌘E switches modes. Capture, so Vim's Ctrl-E and the editors never see it.
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!hasPrimaryModifier(event) || event.altKey || event.shiftKey || event.key.toLowerCase() !== 'e') return;
      event.preventDefault();
      event.stopPropagation();
      switchMode(path);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [active, path]);

  if (doc.missing) {
    const close = () => {
      const index = useUIStore.getState().tabs.findIndex((tab) => tab.path === path);
      if (index >= 0) closeTab(index);
    };
    return (
      <div className="grid h-full place-items-center bg-canvas">
        <EmptyState
          icon={FileQuestion}
          title="This note no longer exists."
          description={<span className="font-mono text-xs">{path}</span>}
          action={<Button onClick={close}>Close tab</Button>}
        />
      </div>
    );
  }

  const saveLabel = doc.saving ? 'Saving…' : '';
  const showTitle = doc.content !== null && (mode === 'rendered' ? !startsWithTitle(doc.content) : false);

  return (
    <PageLayout document>
      <NoteHeader path={path} mode={mode} onModeChange={(next) => switchMode(path, next)} findSlot={setFindSlot} saveLabel={saveLabel} />
      {doc.conflict ? (
        <div className="mt-4">
          <ConflictBanner onLoadTheirs={doc.loadTheirs} onKeepMine={() => void doc.keepMine()} />
        </div>
      ) : null}
      {showTitle ? <h1 className="mt-8 break-words text-2xl font-semibold text-text">{doc.note?.title ?? stem(path)}</h1> : null}
      <div className={showTitle ? 'mt-6' : 'mt-8'}>
        {doc.content === null ? (
          <LoadingState rows={3} />
        ) : mode === 'source' ? (
          <Suspense fallback={<LoadingState rows={3} />}>
            <SourceEditor
              key={path}
              value={doc.content}
              onChange={doc.edit}
              path={path}
              vimKeys={vimKeys}
              initialLine={startLine}
              onTaskToggle={tasks.fromSource}
            />
          </Suspense>
        ) : (
          <Editor
            key={path}
            value={doc.content}
            onChange={doc.edit}
            note={{ path }}
            findSlot={findSlot}
            onTaskToggle={tasks.fromRendered}
            initialLine={startLine}
          />
        )}
      </div>
    </PageLayout>
  );
}
