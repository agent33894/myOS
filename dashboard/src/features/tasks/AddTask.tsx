import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ArtifactType } from '@shared/types';
import { create } from '../../data/gateway';
import { Icon, Input } from '../../ui';
import { CaptureTokens } from '../capture/CaptureTokens';
import { resolveCapture } from '../capture/resolveCapture';
import { useProjectRefs } from './projectRefs';

interface AddTaskProps {
  /** Due date for tasks that don't name one (Today adds for today). */
  due?: string;
  /** Project for tasks that don't name one (a project's own list). */
  project?: string;
}

/** An inline "Add a task…" line that understands the capture syntax. ⏎ adds and stays ready for the next. */
export function AddTask({ due, project }: AddTaskProps) {
  const [text, setText] = useState('');
  const projects = useProjectRefs();
  const resolved = useMemo(() => (text.trim() ? resolveCapture(text, projects.match) : null), [text, projects]);

  const submit = async () => {
    if (!resolved) return;
    const { draft } = resolved;
    setText('');
    try {
      await create(
        { ...draft, type: ArtifactType.TODO, due: draft.due ?? due, project: draft.project ?? project },
        `Add “${draft.title}”`,
      );
    } catch (error) {
      setText(text);
      toast.error(error instanceof Error ? error.message : 'Could not add the task');
    }
  };

  const tokens = resolved?.tokens.filter((token) => token.kind !== 'project' || !project) ?? [];

  return (
    <div className="flex min-h-10 items-center gap-2 rounded-md pl-2 pr-2 transition-colors duration-fast hover:bg-text/5 focus-within:bg-text/5">
      <span className="grid size-6 shrink-0 place-items-center text-text-tertiary">
        <Icon icon={Plus} />
      </span>
      <Input
        variant="ghost"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void submit();
          } else if (event.key === 'Escape' && text) {
            event.stopPropagation();
            setText('');
          }
        }}
        placeholder="Add a task… (tomorrow, #tag, !)"
        aria-label="Add a task"
        className="flex-1 px-0 hover:bg-transparent focus-visible:bg-transparent"
      />
      <CaptureTokens tokens={tokens} className="shrink-0" />
    </div>
  );
}
