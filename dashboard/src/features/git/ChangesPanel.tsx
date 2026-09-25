import { useState } from 'react';
import { GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import type { PanelProps } from '../../app/panels';
import { openNote } from '../../app/navigation';
import { commit, useGitStore } from '../../data/git';
import { Button, EmptyState, Textarea } from '../../ui';

const LETTER = { modified: 'M', added: 'A', deleted: 'D', renamed: 'R', untracked: 'U', conflicted: '!' } as const;

/** Changed files and a commit box. (Wave B: choose files, diffs, ⌘⇧Enter.) */
export function ChangesPanel(_props: PanelProps) {
  const status = useGitStore((state) => state.status);
  const error = useGitStore((state) => state.error);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (!status?.repo) return <EmptyState icon={GitBranch} title="Not a Git repository" description="Changes show here when the folder is in a Git repository." />;
  if (status.files.length === 0) return <EmptyState icon={GitBranch} title="No changes" description="Everything in this folder is committed." />;

  const submit = async () => {
    setBusy(true);
    try {
      const hash = await commit(message);
      setMessage('');
      toast.success(`Committed ${hash.slice(0, 7)}`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'The commit failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 py-2">
      <ul className="flex flex-col font-mono text-xs">
        {status.files.map((file) => (
          <li key={file.path}>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => /\.md$/i.test(file.path) && file.change !== 'deleted' && openNote(file.path)}>
              <span className="w-3 text-text-tertiary">{LETTER[file.change]}</span>
              <span className="truncate">{file.path}</span>
            </Button>
          </li>
        ))}
      </ul>
      <Textarea aria-label="Commit message" placeholder="What changed" value={message} onChange={(event) => setMessage(event.target.value)} />
      <Button variant="primary" loading={busy} disabled={!message.trim()} onClick={() => void submit()}>
        Commit all
      </Button>
      {error ? <p className="whitespace-pre-wrap font-mono text-xs text-danger">{error}</p> : null}
    </div>
  );
}
