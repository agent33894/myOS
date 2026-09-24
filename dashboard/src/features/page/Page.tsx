import { useEffect, useRef, type ReactNode } from 'react';
import { FileQuestion } from 'lucide-react';
import { ArtifactType } from '@shared/types';
import { useDocument } from '../../data/useDocument';
import { Editor } from '../../editor';
import { EmptyState, LoadingState, Textarea } from '../../ui';
import { ConflictBanner } from './ConflictBanner';
import { documentBody } from './documentBody';
import { LinkedFrom } from './LinkedFrom';
import { PageMenu } from './PageMenu';
import { PageProperties } from './PageProperties';
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
  const item = doc.artifact;
  const loaded = doc.content !== null;
  const body = documentBody(doc);

  useEffect(() => {
    if (!isNew || !loaded) return;
    titleRef.current?.focus();
    titleRef.current?.select();
  }, [isNew, loaded]);

  if (doc.missing) {
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
    <div className="h-full overflow-y-auto bg-canvas">
      <div className="mx-auto flex max-w-3xl flex-col px-6 pb-24 pt-4">
        <div className="flex h-10 items-center gap-1">
          {leading}
          <div className="ml-auto flex items-center gap-2">
            <SaveState saving={doc.saving} dirty={doc.dirty} saved={doc.lastSaved !== null} />
            {item ? <PageMenu item={item} flush={doc.saveNow} onDeleted={onDeleted} /> : null}
          </div>
        </div>

        {doc.conflict ? (
          <div className="mt-4">
            <ConflictBanner onLoadTheirs={doc.loadTheirs} onKeepMine={() => void doc.keepMine()} />
          </div>
        ) : null}

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

        {item ? (
          <div className="mt-3">
            <PageProperties item={item} flush={doc.saveNow} onMoved={onMoved} />
          </div>
        ) : null}

        <div ref={bodyRef} className="mt-6">
          {loaded && item ? (
            <Editor
              value={body.value}
              onChange={body.onChange}
              artifact={{ id: item.id, filePath: item.filePath, type: item.type }}
              placeholder={item.type === ArtifactType.TODO ? 'Add notes…' : undefined}
            />
          ) : (
            <LoadingState rows={3} />
          )}
        </div>

        {item ? <LinkedFrom item={item} /> : null}
      </div>
    </div>
  );
}
