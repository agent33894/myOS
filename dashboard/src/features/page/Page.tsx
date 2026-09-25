import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FileQuestion } from 'lucide-react';
import { format } from 'date-fns';
import { parseLocalDate } from '@shared/date';
import { journalDate } from '@shared/journal';
import { ArtifactType } from '@shared/types';
import { movedTo, useDataStore } from '../../data/store';
import { useDocument } from '../../data/useDocument';
import { Editor } from '../../editor';
import { useRenameWithTitle } from '../files/useRenameWithTitle';
import { EmptyState, LoadingState, PageLayout, Textarea } from '../../ui';
import { useUIStore } from '../../store/ui';
import { ConflictBanner } from './ConflictBanner';
import { FocusTaskCue } from './FocusTaskCue';
import { documentBody } from './documentBody';
import { LinkedFrom } from './LinkedFrom';
import { PageMenu } from './PageMenu';
import { PageProperties } from './PageProperties';
import { PageTopBar } from './PageTopBar';
import { SaveState } from './SaveState';
import { useNewParam } from './useNewParam';

interface PageProps {
  path: string;
  /** The start of the top bar: Back and a breadcrumb on the full page. */
  leading?: ReactNode;
  onDeleted: () => void;
  /** The file moved (an Inbox capture became a task or note). */
  onMoved: (path: string) => void;
  /** Shown when the file is gone, usually a way back. */
  missingAction?: ReactNode;
}

/**
 * The one document surface: title, inline properties, and the body editor,
 * saving quietly as you type. A change on disk while there are unsaved edits
 * raises a banner instead of overwriting either side.
 */
export function Page({ path, leading, onDeleted, onMoved, missingAction }: PageProps) {
  const doc = useDocument(path);
  const isNew = useNewParam(path);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [findSlot, setFindSlot] = useState<HTMLDivElement | null>(null);
  const item = doc.artifact;
  const loaded = doc.content !== null;
  const body = documentBody(doc);
  // Focus mode on a task: the task, its When cue and estimate, and its checklist; nothing else.
  const journalDay = item ? journalDate(item) : undefined;
  const focusTask = useUIStore((state) => state.focusMode) && item?.type === ArtifactType.TODO;
  // File names follow titles (features/files): renames after the title is edited, and the URL follows.
  useRenameWithTitle(item, doc.title, onMoved, doc.saveNow);
  // The file moved under this page (renamed, moved to another area, or either undone with ⌘Z): follow it.
  const followTo = useDataStore((state) => (state.byPath[path] ? undefined : movedTo(state, path)));
  const follow = useRef(onMoved);
  follow.current = onMoved;
  useEffect(() => {
    if (followTo) follow.current(followTo);
  }, [followTo]);

  useEffect(() => {
    if (!isNew || !loaded) return;
    titleRef.current?.focus();
    titleRef.current?.select();
  }, [isNew, loaded]);

  if (doc.missing && !followTo) {
    return (
      <div className="grid h-full place-items-center bg-canvas">
        <EmptyState
          icon={FileQuestion}
          title="This page no longer exists."
          description="It may have been moved or deleted outside myOS."
          action={missingAction}
        />
      </div>
    );
  }

  const focusBody = () =>
    bodyRef.current?.querySelector<HTMLElement>('[contenteditable="true"]')?.focus();

  return (
    <PageLayout document>
      <PageTopBar leading={leading} findSlot={setFindSlot}>
        <SaveState saving={doc.saving} dirty={doc.dirty} saved={doc.lastSaved !== null} />
        {item ? <PageMenu item={item} flush={doc.saveNow} onDeleted={onDeleted} onMoved={onMoved} /> : null}
      </PageTopBar>

      {doc.conflict ? (
        <div className="mt-4">
          <ConflictBanner onLoadTheirs={doc.loadTheirs} onKeepMine={() => void doc.keepMine()} />
        </div>
      ) : null}

      {journalDay && doc.title.trim() === journalDay ? (
        // A journal day is named by its date; it reads as one and is never renamed.
        <h1 className="mt-8 text-2xl font-semibold text-text">{format(parseLocalDate(journalDay), 'EEEE, MMMM d, yyyy')}</h1>
      ) : (
        <Textarea
          ref={titleRef}
          autosize
          variant="ghost"
          value={doc.title}
          onChange={(event) => body.onTitleChange(event.target.value.replace(/\n/g, ' '))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              focusBody();
            }
          }}
          placeholder="Untitled"
          aria-label="Title"
          disabled={!loaded}
          className="mt-8 px-0 text-2xl font-semibold hover:bg-transparent focus-visible:bg-transparent disabled:cursor-default disabled:opacity-100"
        />
      )}

      {item && focusTask ? (
        <div className="mt-3">
          <FocusTaskCue task={item} />
        </div>
      ) : item ? (
        <div data-focus-hide className="mt-3">
          <PageProperties item={item} flush={doc.saveNow} onMoved={onMoved} />
        </div>
      ) : null}

      <div ref={bodyRef} className="mt-6">
        {loaded && item ? (
          <Editor
            value={body.value}
            onChange={body.onChange}
            artifact={{ id: item.id, filePath: item.filePath, type: item.type }}
            findSlot={findSlot}
            placeholder={item.type === ArtifactType.TODO ? 'Add notes…' : undefined}
          />
        ) : (
          <LoadingState rows={3} />
        )}
      </div>

      {item ? <LinkedFrom item={item} /> : null}
    </PageLayout>
  );
}
