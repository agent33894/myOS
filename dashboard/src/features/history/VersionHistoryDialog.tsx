import { useEffect, useMemo, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { History, RotateCcw } from 'lucide-react';
import type { VersionInfo } from '@shared/ipc/contracts';
import { listVersions, read, readVersion, restoreVersion } from '../../data/gateway';
import { useDataStore } from '../../data/store';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Spinner,
  cn,
} from '../../ui';
import { failed, followUndo } from './toasts';
import { diffLines, foldUnchanged, splitFrontmatter, type DiffPiece } from './lineDiff';

interface Target {
  path: string;
  /** Save pending edits before comparing or restoring. */
  flush: () => Promise<void>;
}

function whenLabel(savedAt: string): { day: string; time: string } {
  const date = new Date(savedAt);
  const time = format(date, 'HH:mm');
  if (isToday(date)) return { day: 'Today', time };
  if (isYesterday(date)) return { day: 'Yesterday', time };
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return { day: format(date, sameYear ? 'EEE d MMM' : 'd MMM yyyy'), time };
}

const sizeLabel = (bytes: number) => (bytes < 1024 ? `${bytes} bytes` : `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`);

const normalize = (body: string) => body.replace(/^\n+/, '');

interface Comparison {
  pieces: DiffPiece[];
  added: number;
  removed: number;
  /** The title this version had, when it differs from now. */
  oldTitle: string | null;
  propertiesOnly: boolean;
}

function compare(snapshot: string, current: { title: string; content: string }): Comparison {
  const then = splitFrontmatter(snapshot);
  const rows = diffLines(normalize(then.body), normalize(current.content));
  const added = rows.filter((row) => row.type === 'added').length;
  const removed = rows.filter((row) => row.type === 'removed').length;
  const oldTitle = then.title !== null && then.title !== current.title ? then.title : null;
  return { pieces: added || removed ? foldUnchanged(rows) : [], added, removed, oldTitle, propertiesOnly: !added && !removed && !oldTitle };
}

function VersionRow({ version, selected, onSelect }: { version: VersionInfo; selected: boolean; onSelect: () => void }) {
  const { day, time } = whenLabel(version.savedAt);
  return (
    <Button
      variant="ghost"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'h-auto w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left',
        selected ? 'bg-accent-soft text-text hover:bg-accent-soft' : 'text-text',
      )}
    >
      <span className="text-base font-medium">
        {day} <span className={cn('font-normal', selected ? 'text-accent-text' : 'text-text-secondary')}>{time}</span>
      </span>
      <span className="text-xs font-normal text-text-tertiary">{sizeLabel(version.size)}</span>
    </Button>
  );
}

function DiffBody({ comparison }: { comparison: Comparison }) {
  const { pieces, oldTitle, propertiesOnly } = comparison;
  return (
    <div className="flex flex-col gap-2">
      {oldTitle !== null ? (
        <p className="rounded-md bg-sunken px-3 py-2 text-sm text-text-secondary">
          Then titled <span className="font-medium text-text">“{oldTitle}”</span>
        </p>
      ) : null}
      {propertiesOnly ? (
        <p className="px-1 py-6 text-center text-base text-text-secondary">
          The text matches the note as it is now. Only its properties differ.
        </p>
      ) : null}
      {pieces.map((piece, index) =>
        piece.kind === 'gap' ? (
          <div key={index} className="flex items-center gap-3 px-1 py-1 text-xs text-text-tertiary" aria-label={`${piece.count} unchanged lines`}>
            <span className="h-px flex-1 bg-border" />
            {piece.count === 1 ? '1 unchanged line' : `${piece.count} unchanged lines`}
            <span className="h-px flex-1 bg-border" />
          </div>
        ) : (
          <div key={index} className="overflow-hidden rounded-md">
            {piece.rows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className={cn(
                  'flex gap-3 px-3 py-0.5 font-reading text-base leading-6',
                  row.type === 'same' && !row.text.trim() && 'h-2 py-0',
                  row.type === 'added' && 'bg-success-soft',
                  row.type === 'removed' && 'bg-danger-soft',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'w-3 shrink-0 select-none text-center font-sans font-medium',
                    row.type === 'added' ? 'text-success' : row.type === 'removed' ? 'text-danger' : 'text-transparent',
                  )}
                >
                  {row.type === 'added' ? '+' : row.type === 'removed' ? '−' : '·'}
                </span>
                <span className="sr-only">{row.type === 'added' ? 'Added: ' : row.type === 'removed' ? 'Removed: ' : ''}</span>
                <span className={cn('min-w-0 flex-1 whitespace-pre-wrap break-words', row.type === 'same' ? 'text-text-secondary' : 'text-text')}>
                  {row.type === 'same' && !row.text.trim() ? null : row.text || '\u00a0'}
                </span>
              </div>
            ))}
          </div>
        ),
      )}
    </div>
  );
}

function VersionsBrowser({ target, onClose }: { target: Target; onClose: () => void }) {
  const item = useDataStore((state) => state.notes[target.path]);
  const [versions, setVersions] = useState<VersionInfo[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [current, setCurrent] = useState<{ title: string; content: string } | null>(null);
  const [snapshot, setSnapshot] = useState<{ id: string; text: string } | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    let active = true;
    void target
      .flush()
      .then(() => Promise.all([listVersions(target.path), read(target.path)]))
      .then(([list, file]) => {
        if (!active) return;
        setVersions(list);
        setCurrent({ title: file.title, content: file.content });
        setSelected(list[0]?.id ?? null);
      })
      .catch((error: unknown) => {
        failed(error, 'Could not load earlier versions');
        if (active) setVersions([]);
      });
    return () => {
      active = false;
    };
  }, [target]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    void readVersion(target.path, selected).then(
      (text) => active && setSnapshot({ id: selected, text }),
      (error: unknown) => failed(error, 'Could not open that version'),
    );
    return () => {
      active = false;
    };
  }, [selected, target.path]);

  const comparison = useMemo(
    () => (snapshot && current && snapshot.id === selected ? compare(snapshot.text, current) : null),
    [snapshot, current, selected],
  );
  const chosen = versions?.find((version) => version.id === selected);

  const restore = async () => {
    if (!item || !selected) return;
    setRestoring(true);
    try {
      await target.flush();
      await restoreVersion(target.path, selected);
      followUndo('Restored');
      onClose();
    } catch (error) {
      failed(error, 'Could not restore that version');
      setRestoring(false);
    }
  };

  if (versions === null) {
    return (
      <div className="grid h-full place-items-center">
        <Spinner label="Loading versions" />
      </div>
    );
  }

  if (!versions.length) {
    return (
      <div className="grid h-full place-items-center">
        <EmptyState
          icon={History}
          title="No earlier versions yet."
          description="myOS Next keeps a copy each time you save, at most every ten minutes."
        />
      </div>
    );
  }

  const when = chosen ? whenLabel(chosen.savedAt) : null;
  return (
    <div className="flex h-full min-h-0 gap-4">
      <nav aria-label="Saved versions" className="-ml-2 flex w-52 shrink-0 flex-col gap-0.5 overflow-y-auto pr-1">
        {versions.map((version) => (
          <VersionRow key={version.id} version={version} selected={version.id === selected} onSelect={() => setSelected(version.id)} />
        ))}
      </nav>
      <section aria-label="Changes since this version" className="flex min-w-0 flex-1 flex-col rounded-lg bg-canvas">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-base font-medium text-text">
              {when ? `${when.day} at ${when.time}` : 'Version'}
            </span>
            <span className="flex items-center gap-2 text-xs text-text-tertiary">
              {comparison ? (
                <>
                  <span>Compared with now</span>
                  {comparison.added ? <span className="font-medium text-success">+{comparison.added}</span> : null}
                  {comparison.removed ? <span className="font-medium text-danger">−{comparison.removed}</span> : null}
                </>
              ) : (
                'Compared with now'
              )}
            </span>
          </div>
          <Button variant="primary" leadingIcon={RotateCcw} loading={restoring} disabled={!comparison} onClick={() => void restore()}>
            Restore this version
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {comparison ? (
            <DiffBody comparison={comparison} />
          ) : (
            <div className="grid h-full place-items-center">
              <Spinner label="Loading version" />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/** Local copies of one note: saved versions, what changed since each, and Restore. */
export function VersionHistoryDialog({ target, onClose }: { target: Target | null; onClose: () => void }) {
  const title = useDataStore((state) => (target ? state.notes[target.path]?.title : undefined));
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size="lg"
        className="max-w-4xl"
        style={{ height: 'min(44rem, calc(100vh - 6rem))' }}
        // Start on the list of versions, not the close button.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement | null)?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>
            {title ? `“${title}” · ` : ''}A copy is kept each time you save, at most every ten minutes, for thirty days.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1">{target ? <VersionsBrowser target={target} onClose={onClose} /> : null}</div>
      </DialogContent>
    </Dialog>
  );
}

export type { Target as HistoryTarget };
