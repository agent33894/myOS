import { useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { read, readVersion, restoreVersion } from '../../data/gateway';
import { restoreCommit, showAt } from '../../data/git';
import { useDataStore } from '../../data/store';
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Spinner } from '../../ui';
import { DiffCounts, DiffView } from '../git/DiffView';
import { EntryRow } from './EntryRow';
import { compare, relativeDate, type HistoryEntry } from './timeline';
import { failed, followUndo } from './toasts';

interface HistoryDialogProps {
  path: string;
  entries: HistoryEntry[];
  /** The entry shown, or null when closed. */
  selected: string | null;
  onSelect: (id: string | null) => void;
}

const textOf = (path: string, entry: HistoryEntry) =>
  entry.kind === 'commit' ? showAt(entry.commit.path ?? path, entry.commit.hash) : readVersion(path, entry.version.id);

/** Every commit and local copy of a note, what changed since each, and Restore. */
export function HistoryDialog({ path, entries, selected, onSelect }: HistoryDialogProps) {
  const rev = useDataStore((state) => state.notes[path]?.rev);
  const title = useDataStore((state) => state.notes[path]?.title);
  const entry = entries.find((each) => each.id === selected) ?? null;
  const [current, setCurrent] = useState<{ title: string; content: string } | null>(null);
  const [earlier, setEarlier] = useState<{ id: string; text: string } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const open = entry !== null;

  // The note as it is now; again whenever it changes on disk.
  useEffect(() => {
    if (!open) return;
    let active = true;
    read(path).then(
      (note) => active && setCurrent({ title: note.title, content: note.content }),
      (error: unknown) => failed(error, 'Could not read the note'),
    );
    return () => {
      active = false;
    };
  }, [open, path, rev]);

  useEffect(() => {
    if (!entry) return;
    let active = true;
    textOf(path, entry).then(
      (text) => active && setEarlier({ id: entry.id, text }),
      (error: unknown) => failed(error, 'Could not open that version'),
    );
    return () => {
      active = false;
    };
  }, [entry, path]);

  const comparison = useMemo(
    () => (earlier && current && earlier.id === entry?.id ? compare(earlier.text, current) : null),
    [earlier, current, entry?.id],
  );

  const restore = async () => {
    if (!entry) return;
    setRestoring(true);
    try {
      if (entry.kind === 'commit') await restoreCommit(path, entry.commit);
      else await restoreVersion(path, entry.version.id);
      followUndo(entry.kind === 'commit' ? `Restored from commit ${entry.commit.hash.slice(0, 7)}` : 'Restored the local copy');
      onSelect(null);
    } catch (error) {
      failed(error, 'Could not restore that version');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onSelect(null)}>
      <DialogContent size="lg" className="max-w-5xl" style={{ height: 'min(48rem, calc(100vh - 6rem))' }}>
        <DialogHeader className="pr-10">
          <DialogTitle>History</DialogTitle>
          <DialogDescription>
            {title ? `“${title}” · ` : ''}Commits that touched this note, and the local copies kept when it was saved (for thirty days).
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 gap-4">
          <nav aria-label="Versions" className="-ml-2 flex w-64 shrink-0 flex-col gap-0.5 overflow-y-auto pr-1">
            {entries.map((each) => (
              <EntryRow key={each.id} entry={each} selected={each.id === selected} onSelect={() => onSelect(each.id)} />
            ))}
          </nav>
          <section aria-label="Changes since this version" className="flex min-w-0 flex-1 flex-col rounded-lg bg-canvas">
            <header className="flex items-center gap-3 border-b border-border px-4 py-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-base font-medium text-text">
                  {entry?.kind === 'commit' ? entry.commit.subject : entry ? `Local copy, ${relativeDate(entry.date)}` : ''}
                </span>
                <span className="flex items-center gap-2 text-xs text-text-tertiary">
                  {entry?.kind === 'commit' ? (
                    <span className="font-mono">
                      {entry.commit.hash.slice(0, 7)} · {entry.commit.author}
                    </span>
                  ) : null}
                  <span>From this version to now</span>
                  {comparison ? <DiffCounts diff={comparison.diff} /> : null}
                </span>
              </div>
              <Button variant="primary" leadingIcon={RotateCcw} loading={restoring} disabled={!comparison} onClick={() => void restore()}>
                Restore this version
              </Button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {comparison ? (
                <div className="flex flex-col gap-3">
                  {comparison.oldTitle !== null ? (
                    <p className="rounded-md bg-sunken px-3 py-2 text-sm text-text-secondary">
                      Then titled <span className="font-medium text-text">“{comparison.oldTitle}”</span>
                    </p>
                  ) : null}
                  <DiffView diff={comparison.diff} empty="The text is the same as now. Only properties may differ." />
                </div>
              ) : (
                <div className="grid h-full place-items-center">
                  <Spinner label="Loading version" />
                </div>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
