import { useEffect, useState } from 'react';
import { FileQuestion } from 'lucide-react';
import { useDocument } from '../../data/useDocument';
import { Editor } from '../../editor';
import { useActivePath, type TabMode } from '../../store/ui';
import { EmptyState, LoadingState, PageLayout, Textarea } from '../../ui';
import { ConflictBanner } from './ConflictBanner';
import { countWords, useNoteStatus } from './noteStatus';
import { NoteTopBar } from './NoteTopBar';
import { SaveState } from './SaveState';

interface NoteTabProps {
  path: string;
  mode: TabMode;
  /** A missing file opens empty and is made on the first edit (today's daily note). */
  createOnWrite?: boolean;
}

const stem = (path: string) => path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/i, '');

/**
 * One note in a tab: its name, and the body rendered or as Markdown source,
 * saving quietly as you type. A change on disk while there are unsaved edits
 * raises a banner instead of overwriting either side. A daily note that does
 * not exist yet opens empty and is made on the first edit.
 */
export function NoteTab({ path, mode, createOnWrite = false }: NoteTabProps) {
  const doc = useDocument(path, { createOnWrite });
  const [findSlot, setFindSlot] = useState<HTMLDivElement | null>(null);
  const active = useActivePath() === path;

  useEffect(() => {
    if (!active) return;
    useNoteStatus.setState({ path, words: countWords(doc.content ?? ''), saving: doc.saving, dirty: doc.dirty, saved: doc.lastSaved !== null });
  }, [active, path, doc.content, doc.saving, doc.dirty, doc.lastSaved]);

  if (doc.missing) {
    return (
      <div className="grid h-full place-items-center bg-canvas">
        <EmptyState icon={FileQuestion} title="This note no longer exists." description="It may have been moved or deleted outside myOS Next." />
      </div>
    );
  }

  return (
    <PageLayout document>
      <NoteTopBar findSlot={setFindSlot}>
        <SaveState saving={doc.saving} dirty={doc.dirty} saved={doc.lastSaved !== null} />
      </NoteTopBar>
      {doc.conflict ? (
        <div className="mt-4">
          <ConflictBanner onLoadTheirs={doc.loadTheirs} onKeepMine={() => void doc.keepMine()} />
        </div>
      ) : null}
      <h1 className="mt-8 break-words text-2xl font-semibold text-text">{doc.note?.title ?? stem(path)}</h1>
      <div className="mt-6">
        {doc.content === null ? (
          <LoadingState rows={3} />
        ) : mode === 'source' ? (
          <Textarea
            autosize
            variant="ghost"
            aria-label="Markdown source"
            value={doc.content}
            onChange={(event) => doc.edit(event.target.value)}
            className="px-0 font-mono text-sm hover:bg-transparent focus-visible:bg-transparent"
          />
        ) : (
          <Editor key={path} value={doc.content} onChange={doc.edit} note={{ path }} findSlot={findSlot} />
        )}
      </div>
    </PageLayout>
  );
}
