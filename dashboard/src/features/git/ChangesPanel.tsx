import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Check, FolderGit2, GitBranch } from 'lucide-react';
import type { GitFileStatus, GitStatus } from '@shared/ipc/contracts';
import type { PanelProps } from '../../app/panels';
import { commit, pull, push, useGitStore } from '../../data/git';
import { hasPrimaryModifier } from '../../lib/platform';
import { Button, Checkbox, EmptyState, Icon, Input, Kbd, Spinner, Textarea, cn } from '../../ui';
import { firstPushTarget, gitSays, initWithToast, lastLine, useCommitFocus } from './actions';
import { CHANGE_STYLE } from './changeStyle';
import { COMMIT_SHORTCUT } from './commands';
import { FileDiffDialog } from './FileDiffDialog';

type Outcome = { tone: 'ok' | 'error'; text: string } | null;

/** Branch, upstream, and the Pull and Push buttons. They only ever run when clicked. */
function BranchHeader({ status }: { status: GitStatus }) {
  const syncing = useGitStore((state) => state.syncing);
  const [outcome, setOutcome] = useState<Outcome>(null);

  // A branch with no upstream can be pushed to origin under its own name, which then tracks it.
  const target = firstPushTarget(status);
  const firstPush = target !== null;
  const run = (kind: 'pull' | 'push') => {
    setOutcome(null);
    (kind === 'pull' ? pull() : push(firstPush)).then(
      (output) => setOutcome({ tone: 'ok', text: lastLine(output) || (kind === 'pull' ? 'Pulled.' : 'Pushed.') }),
      (error: unknown) => setOutcome({ tone: 'error', text: gitSays(error) }),
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon icon={GitBranch} className="text-text-tertiary" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-mono text-sm font-medium text-text">{status.branch ?? 'Detached HEAD'}</span>
          <span className="truncate font-mono text-xs text-text-tertiary">
            {status.upstream
              ? [status.upstream, status.ahead ? `↑${status.ahead}` : '', status.behind ? `↓${status.behind}` : '', !status.ahead && !status.behind ? 'up to date' : ''].filter(Boolean).join('  ')
              : firstPush
                ? `Not on a remote yet. Push sends it to ${target}.`
                : 'No upstream branch'}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        {firstPush ? null : (
          <Button variant="secondary" size="sm" className="flex-1" leadingIcon={ArrowDownToLine} loading={syncing === 'pull'} disabled={syncing !== null} onClick={() => run('pull')}>
            {syncing === 'pull' ? 'Pulling…' : status.behind ? `Pull ${status.behind}` : 'Pull'}
          </Button>
        )}
        <Button variant="secondary" size="sm" className="flex-1" leadingIcon={ArrowUpFromLine} loading={syncing === 'push'} disabled={syncing !== null} onClick={() => run('push')}>
          {syncing === 'push' ? 'Pushing…' : firstPush ? `Push and set upstream (${target})` : status.ahead ? `Push ${status.ahead}` : 'Push'}
        </Button>
      </div>
      {outcome ? (
        <p
          role={outcome.tone === 'error' ? 'alert' : 'status'}
          className={cn('whitespace-pre-wrap break-words rounded-md px-3 py-2 font-mono text-xs', outcome.tone === 'error' ? 'bg-danger-soft text-danger' : 'bg-sunken text-text-secondary')}
        >
          {outcome.text}
        </p>
      ) : null}
    </div>
  );
}

function FileRow({ file, checked, onCheck, onOpen }: { file: GitFileStatus; checked: boolean; onCheck: (checked: boolean) => void; onOpen: () => void }) {
  const style = CHANGE_STYLE[file.change];
  const slash = file.path.lastIndexOf('/');
  return (
    <li className="group flex items-center gap-1 rounded-md hover:bg-text/5">
      <Checkbox shape="square" checked={checked} onCheckedChange={onCheck} aria-label={`Include ${file.path}`} className="ml-1" />
      <Button
        variant="ghost"
        size="sm"
        title={`${style.label}: ${file.path}${file.from ? ` (from ${file.from})` : ''}`}
        className="h-8 min-w-0 flex-1 justify-start gap-2 px-1 font-mono text-xs font-normal hover:bg-transparent"
        onClick={onOpen}
      >
        <span className={cn('w-3 shrink-0 text-center font-medium', style.text)} aria-label={style.label}>
          {style.letter}
        </span>
        <span className={cn('min-w-0 truncate', file.change === 'deleted' && 'line-through decoration-text-tertiary')}>
          <span className="text-text">{file.path.slice(slash + 1)}</span>
          {slash > 0 ? <span className="pl-2 text-text-tertiary">{file.path.slice(0, slash)}</span> : null}
        </span>
      </Button>
    </li>
  );
}

/** Where the commit message goes: a bold one-line summary, then an optional description. */
function CommitBox({ files, all, onCommitted }: { files: GitFileStatus[]; all: boolean; onCommitted: (hash: string, count: number) => void }) {
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const summaryRef = useRef<HTMLInputElement>(null);
  const focusRequest = useCommitFocus((state) => state.request);

  useEffect(() => {
    if (focusRequest) summaryRef.current?.focus();
  }, [focusRequest]);

  const count = files.length;
  const submit = async () => {
    if (!summary.trim() || !count || busy) return;
    setBusy(true);
    setError(null);
    try {
      // A rename is committed with the path it left.
      const paths = all ? undefined : files.flatMap((file) => (file.from ? [file.path, file.from] : [file.path]));
      const message = body.trim() ? `${summary.trim()}\n\n${body.trim()}` : summary.trim();
      const hash = await commit(message, paths);
      setSummary('');
      setBody('');
      onCommitted(hash, count);
    } catch (cause) {
      setError(gitSays(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-commit-box
      className="flex flex-col gap-2"
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.shiftKey && hasPrimaryModifier(event.nativeEvent)) {
          event.preventDefault();
          void submit();
        }
      }}
    >
      <Input ref={summaryRef} aria-label="Summary" placeholder="Summary" value={summary} className="font-medium" onChange={(event) => setSummary(event.target.value)} />
      <Textarea aria-label="Description" placeholder="Description (optional)" rows={3} value={body} onChange={(event) => setBody(event.target.value)} />
      <Button variant="primary" loading={busy} disabled={!summary.trim() || !count} onClick={() => void submit()} className="w-full">
        {count === 1 ? 'Commit 1 file' : `Commit ${count} files`}
        <Kbd shortcut={COMMIT_SHORTCUT} className="bg-transparent text-accent-on" />
      </Button>
      {error ? (
        <p role="alert" className="whitespace-pre-wrap break-words rounded-md bg-danger-soft px-3 py-2 font-mono text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Changed files, their diffs, a commit message, and Pull and Push. Outside a repository, one offer: git init. */
export function ChangesPanel(_props: PanelProps) {
  const status = useGitStore((state) => state.status);
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());
  const [viewing, setViewing] = useState<number | null>(null);
  const [committed, setCommitted] = useState<{ hash: string; count: number } | null>(null);
  const syncing = useGitStore((state) => state.syncing);
  // A pull can rebase the commit just made, so its hash would no longer be true.
  useEffect(() => {
    if (syncing) setCommitted(null);
  }, [syncing]);
  const files = status?.files ?? [];
  const chosen = files.filter((file) => !excluded.has(file.path));
  const all = chosen.length === files.length;

  if (!status) {
    return (
      <div className="grid place-items-center py-12">
        <Spinner label="Reading Git status" />
      </div>
    );
  }

  if (!status.repo) {
    return (
      <EmptyState
        icon={FolderGit2}
        title="Not a Git repository"
        description="This folder is not in a Git repository, so there are no changes to show."
        action={
          <Button variant="secondary" onClick={initWithToast}>
            Initialize a repository here
          </Button>
        }
      />
    );
  }

  const toggleAll = () => setExcluded(all ? new Set(files.map((file) => file.path)) : new Set());

  return (
    <div className="flex flex-col gap-4 py-2">
      <BranchHeader status={status} />
      {committed ? (
        <p role="status" className="flex items-center gap-2 text-sm text-text-secondary">
          <Icon icon={Check} size="sm" className="text-success" />
          <span>
            Committed <span className="font-mono text-text">{committed.hash.slice(0, 7)}</span>
            {` · ${committed.count} ${committed.count === 1 ? 'file' : 'files'}`}
          </span>
        </p>
      ) : null}
      {files.length === 0 ? (
        <p className="px-1 text-sm text-text-tertiary">No changes. Everything in this folder is committed.</p>
      ) : (
        <>
          <section aria-label="Changed files" className="flex flex-col gap-1">
            <div className="flex items-center gap-2 px-1">
              <h3 className="flex-1 text-sm font-medium text-text-secondary">
                Changes <span className="font-normal text-text-tertiary">{files.length}</span>
              </h3>
              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={toggleAll}>
                {all ? 'Select none' : 'Select all'}
              </Button>
            </div>
            <ul className="flex flex-col">
              {files.map((file, index) => (
                <FileRow
                  key={file.path}
                  file={file}
                  checked={!excluded.has(file.path)}
                  onCheck={(checked) =>
                    setExcluded((current) => {
                      const next = new Set(current);
                      if (checked) next.delete(file.path);
                      else next.add(file.path);
                      return next;
                    })
                  }
                  onOpen={() => setViewing(index)}
                />
              ))}
            </ul>
          </section>
          <CommitBox files={chosen} all={all} onCommitted={(hash, count) => setCommitted({ hash, count })} />
        </>
      )}
      <FileDiffDialog files={files} index={viewing} onIndex={setViewing} />
    </div>
  );
}
