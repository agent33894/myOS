import { useEffect, useMemo, useState } from 'react';
import { FileDiff, History } from 'lucide-react';
import type { GitCommit, VersionInfo } from '@shared/ipc/contracts';
import type { PanelProps } from '../../app/panels';
import { listVersions } from '../../data/gateway';
import { log, useGitFile, useGitStatus } from '../../data/git';
import { useNote } from '../../data/selectors';
import { Button, EmptyState, Icon, Spinner, cn } from '../../ui';
import { CHANGE_STYLE } from '../git/changeStyle';
import { FileDiffDialog } from '../git/FileDiffDialog';
import { EntryRow } from './EntryRow';
import { HistoryDialog } from './HistoryDialog';
import { mergeTimeline } from './timeline';
import { failed } from './toasts';

const COMMIT_LIMIT = 100;

/** The open note's history: Git commits that touched it and local copies, newest first, each with a diff and Restore. */
export function HistoryPanel({ path }: PanelProps) {
  const inRepo = useGitStatus()?.repo ?? false;
  const rev = useNote(path)?.rev;
  const uncommitted = useGitFile(path);
  const [loaded, setLoaded] = useState<{ path: string; commits: GitCommit[]; versions: VersionInfo[] } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showingUncommitted, setShowingUncommitted] = useState(false);
  const entries = useMemo(() => (loaded ? mergeTimeline(loaded.commits, loaded.versions) : []), [loaded]);

  useEffect(() => {
    if (!path) return;
    let active = true;
    Promise.all([inRepo ? log(path, COMMIT_LIMIT).catch(() => []) : Promise.resolve([]), listVersions(path)]).then(
      ([commits, versions]) => active && setLoaded({ path, commits, versions }),
      (error: unknown) => {
        failed(error, 'Could not load this note’s history');
        if (active) setLoaded({ path, commits: [], versions: [] });
      },
    );
    return () => {
      active = false;
    };
    // A new rev means a save (maybe a new local copy) or a commit elsewhere; `uncommitted` flips after a commit.
  }, [path, inRepo, rev, uncommitted?.change]);

  if (!path) return <EmptyState icon={History} title="No note open" description="Open a note to see its history." />;
  if (loaded?.path !== path) {
    return (
      <div className="grid place-items-center py-12">
        <Spinner label="Loading history" />
      </div>
    );
  }

  const style = uncommitted ? CHANGE_STYLE[uncommitted.change] : null;

  return (
    <div className="flex flex-col gap-1 py-2">
      {uncommitted && style ? (
        <Button
          variant="ghost"
          className="h-auto w-full justify-start gap-2 rounded-md px-3 py-2 text-left font-normal"
          onClick={() => setShowingUncommitted(true)}
        >
          <Icon icon={FileDiff} size="sm" className={style.text} />
          <span className="flex min-w-0 flex-col">
            <span className="text-sm text-text">Uncommitted changes</span>
            <span className="text-xs text-text-tertiary">{style.label} since the last commit</span>
          </span>
        </Button>
      ) : null}
      {entries.length ? (
        <ol aria-label="History" className={cn('flex flex-col gap-0.5', uncommitted && 'border-t border-border pt-1')}>
          {entries.map((entry) => (
            <li key={entry.id}>
              <EntryRow entry={entry} onSelect={() => setSelected(entry.id)} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-3 py-2 text-sm text-text-tertiary">
          {inRepo ? 'No commits or local copies yet. A copy is kept each time you save, at most every ten minutes.' : 'No local copies yet. A copy is kept each time you save, at most every ten minutes.'}
        </p>
      )}
      <HistoryDialog path={path} entries={entries} selected={selected} onSelect={setSelected} />
      {uncommitted ? <FileDiffDialog files={[uncommitted]} index={showingUncommitted ? 0 : null} onIndex={(index) => setShowingUncommitted(index !== null)} /> : null}
    </div>
  );
}
