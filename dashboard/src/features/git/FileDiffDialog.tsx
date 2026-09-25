import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import type { GitFileStatus } from '@shared/ipc/contracts';
import { openNote } from '../../app/navigation';
import { diff } from '../../data/git';
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, IconButton, Spinner, cn } from '../../ui';
import { CHANGE_STYLE } from './changeStyle';
import { parseUnifiedDiff } from './diff';
import { DiffCounts, DiffView } from './DiffView';
import { gitSays } from './actions';

interface FileDiffDialogProps {
  files: GitFileStatus[];
  /** The file shown, or null when closed. */
  index: number | null;
  onIndex: (index: number | null) => void;
}

/** One changed file against the last commit, with ↑ ↓ (or k j) to step through the other changes. */
export function FileDiffDialog({ files, index, onIndex }: FileDiffDialogProps) {
  const file = index === null ? undefined : files[index];
  const [loaded, setLoaded] = useState<{ path: string; text: string } | { path: string; error: string } | null>(null);

  useEffect(() => {
    if (!file) return;
    let active = true;
    diff(file.path).then(
      (text) => active && setLoaded({ path: file.path, text }),
      (error: unknown) => active && setLoaded({ path: file.path, error: gitSays(error) }),
    );
    return () => {
      active = false;
    };
    // Reload when the file's change (and so its diff) may have moved.
  }, [file]);

  const parsed = useMemo(() => (loaded && 'text' in loaded ? parseUnifiedDiff(loaded.text) : null), [loaded]);
  const ready = loaded?.path === file?.path;
  const step = (by: number) => index !== null && files.length && onIndex((index + by + files.length) % files.length);
  const style = file ? CHANGE_STYLE[file.change] : null;
  const canOpen = file && /\.md$/i.test(file.path) && file.change !== 'deleted';

  return (
    <Dialog open={Boolean(file)} onOpenChange={(open) => !open && onIndex(null)}>
      <DialogContent
        size="lg"
        className="max-w-5xl"
        style={{ height: 'min(48rem, calc(100vh - 6rem))' }}
        // Start on the diff, so ↑ ↓ work at once and no tooltip pops up.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement | null)?.focus();
        }}
        onKeyDown={(event) => {
          if ((event.target as HTMLElement).closest('button') && (event.key === 'Enter' || event.key === ' ')) return;
          if (event.key === 'ArrowDown' || event.key === 'j') step(1);
          else if (event.key === 'ArrowUp' || event.key === 'k') step(-1);
          else return;
          event.preventDefault();
        }}
      >
        <DialogHeader className="pr-10">
          <DialogTitle className="flex min-w-0 items-center gap-2">
            {style ? <span className={cn('w-4 shrink-0 text-center font-mono text-sm', style.text)}>{style.letter}</span> : null}
            <span className="truncate font-mono text-base font-medium">{file?.path}</span>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-3">
            <span>
              {style?.label}
              {file?.from ? ` from ${file.from}` : ''} · compared with the last commit
            </span>
            {parsed && ready ? <DiffCounts diff={parsed} /> : null}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-1">
          <IconButton icon={ChevronUp} label="Previous change" size="sm" disabled={files.length < 2} onClick={() => step(-1)} />
          <IconButton icon={ChevronDown} label="Next change" size="sm" disabled={files.length < 2} onClick={() => step(1)} />
          <span className="text-xs text-text-tertiary">
            {index !== null ? index + 1 : 0} of {files.length}
          </span>
          <span className="flex-1" />
          {canOpen ? (
            <Button
              variant="ghost"
              size="sm"
              leadingIcon={FileText}
              onClick={() => {
                openNote(file.path);
                onIndex(null);
              }}
            >
              Open note
            </Button>
          ) : null}
        </div>
        <div className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {!ready ? (
            <div className="grid h-full place-items-center">
              <Spinner label="Loading the diff" />
            </div>
          ) : loaded && 'error' in loaded ? (
            <p className="whitespace-pre-wrap rounded-md bg-danger-soft px-3 py-2 font-mono text-sm text-danger">{loaded.error}</p>
          ) : parsed ? (
            <DiffView diff={parsed} empty={file?.change === 'untracked' ? 'This file is empty.' : 'No line changes (only the file mode or name changed).'} />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
