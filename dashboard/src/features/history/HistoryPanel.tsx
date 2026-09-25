import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import type { GitCommit } from '@shared/ipc/contracts';
import type { PanelProps } from '../../app/panels';
import { log, useGitStatus } from '../../data/git';
import { useNote } from '../../data/selectors';
import { Button, EmptyState } from '../../ui';
import { openVersionHistory } from './openVersionHistory';

/** The open note's history: its Git commits, and the local copies kept on each save. (Wave B: diffs and restore from Git.) */
export function HistoryPanel({ path }: PanelProps) {
  const inRepo = useGitStatus()?.repo ?? false;
  const rev = useNote(path)?.rev;
  const [commits, setCommits] = useState<GitCommit[]>([]);

  useEffect(() => {
    if (!path || !inRepo) return setCommits([]);
    let active = true;
    log(path, 30).then(
      (list) => active && setCommits(list),
      () => active && setCommits([]),
    );
    return () => {
      active = false;
    };
  }, [path, inRepo, rev]);

  if (!path) return <EmptyState icon={History} title="No note open" description="Open a note to see its history." />;
  return (
    <div className="flex flex-col gap-3 py-2">
      <Button variant="secondary" leadingIcon={History} onClick={() => openVersionHistory(path)}>
        Local copies…
      </Button>
      {commits.length ? (
        <ul className="flex flex-col gap-2 text-sm">
          {commits.map((commit) => (
            <li key={commit.hash} className="flex flex-col">
              <span className="truncate text-text">{commit.subject}</span>
              <span className="font-mono text-xs text-text-tertiary">
                {commit.hash.slice(0, 7)} · {commit.date.slice(0, 10)} · {commit.author}
              </span>
            </li>
          ))}
        </ul>
      ) : inRepo ? (
        <p className="text-sm text-text-tertiary">No commits touch this note yet.</p>
      ) : null}
    </div>
  );
}
