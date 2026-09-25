import { Suspense, useEffect, useRef, useState } from 'react';
import { extractTasks } from '@shared/tasks';
import type { NoteSummary } from '@shared/spec';
import { FileQuestion } from 'lucide-react';
import { useDataStore } from '../../data/store';
import { useDocument } from '../../data/useDocument';
import { Editor, SourceEditor } from '../../editor';
import { editorFor, useCaretLines } from '../../editor/bridge';
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
  /** A 1-based line of the file to show (from a task list's `&line=`). */
  line?: number;
}

const stem = (path: string) => path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/i, '');

/** A body that opens with its own `# Heading` already has a title on the page. */
const startsWithTitle = (content: string) => /^#\s+\S/.test(content);

/**
 * The body line (0-based, as the editors count) for a line of the file. A
 * task line is found exactly by its place among the file's tasks; any other
 * line uses the offset the tasks show, else the file line itself.
 */
function bodyLineOf(note: Pick<NoteSummary, 'tasks'> | undefined, content: string, path: string, fileLine: number): number {
  const inFile = (note?.tasks ?? []).filter((task) => task.line > 0);
  const inBody = extractTasks(content, path);
  const index = inFile.findIndex((task) => task.line === fileLine);
  if (index >= 0 && inBody[index]?.raw === inFile[index].raw) return inBody[index].line - 1;
  const offset = inFile.length && inBody.length ? inFile[0].line - inBody[0].line : 0;
  return Math.max(0, fileLine - offset - 1);
}

const REVEAL_TRIES = 12;
const REVEAL_WAIT_MS = 80;

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
export function NoteTab({ path, mode, createOnWrite = false, line }: NoteTabProps) {
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

  // Opened at a line (a task row): scroll there and light it up once the editor is ready.
  const loaded = doc.content !== null;
  const latestContent = useRef(doc.content);
  latestContent.current = doc.content;
  const shownLine = useRef<number | null>(null);
  useEffect(() => {
    if (!line || !loaded || shownLine.current === line) return;
    shownLine.current = line;
    let tries = 0;
    let timer = 0;
    const attempt = () => {
      const content = latestContent.current ?? '';
      const target = bodyLineOf(useDataStore.getState().notes[path], content, path, line);
      if (editorFor(path)?.revealLine(target, { flash: true }) === true || (tries += 1) >= REVEAL_TRIES) return;
      timer = window.setTimeout(attempt, REVEAL_WAIT_MS);
    };
    timer = window.setTimeout(attempt, REVEAL_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [line, loaded, path]);

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
