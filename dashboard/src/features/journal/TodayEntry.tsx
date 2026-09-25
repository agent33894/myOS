import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { journalPath } from '@shared/journal';
import { ArtifactType } from '@shared/types';
import { createJournal } from '../../data/pages';
import { useArtifact } from '../../data/selectors';
import { useDocument } from '../../data/useDocument';
import { Editor } from '../../editor';
import { ConflictBanner } from '../page/ConflictBanner';
import { SaveState } from '../page/SaveState';

/**
 * Today's journal page, written in place. Nothing exists on disk until the
 * first keystroke; what is typed while the page is being created is kept and
 * saved into it.
 */
export function TodayEntry({ date, label }: { date: string; label: string }) {
  const path = journalPath(date);
  const exists = useArtifact(path) !== undefined;
  const doc = useDocument(exists ? path : null);
  const pending = useRef<string | null>(null);
  const creating = useRef(false);
  const loaded = exists && doc.content !== null;

  // The page now exists: hand it whatever was typed while it was being made.
  useEffect(() => {
    if (!loaded || pending.current === null) return;
    const text = pending.current;
    pending.current = null;
    if (text.trim() !== (doc.content ?? '').trim()) doc.edit({ content: text });
  }, [loaded]);

  const onChange = (markdown: string) => {
    if (loaded && pending.current === null) {
      if (markdown.trim() !== (doc.content ?? '').trim()) doc.edit({ content: markdown });
      return;
    }
    pending.current = markdown;
    if (creating.current || !markdown.trim()) return;
    creating.current = true;
    createJournal(date).catch((error: unknown) => {
      creating.current = false;
      toast.error(error instanceof Error ? error.message : 'Could not start today’s page');
    });
  };

  const value = pending.current ?? (loaded ? (doc.content ?? '') : '');

  return (
    <section aria-label="Today’s page" className="flex flex-col gap-4 rounded-xl bg-raised px-8 pb-8 pt-6 shadow-raised">
      <header className="flex items-baseline gap-3">
        <h2 className="text-lg font-semibold text-text">Today</h2>
        <span className="text-base text-text-tertiary">{label}</span>
        <span className="ml-auto">
          <SaveState saving={doc.saving} dirty={doc.dirty} saved={doc.lastSaved !== null} />
        </span>
      </header>
      {doc.conflict ? <ConflictBanner onLoadTheirs={doc.loadTheirs} onKeepMine={() => void doc.keepMine()} /> : null}
      <div className="min-h-32">
        <Editor
          value={value}
          onChange={onChange}
          artifact={{ id: date, filePath: path, type: ArtifactType.JOURNAL }}
          placeholder="What’s on your mind today?"
          findSlot={null}
        />
      </div>
    </section>
  );
}
