import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ArtifactType, type ArtifactDraft } from '@shared/types';
import { create } from '../../data/gateway';
import { Icon, Input } from '../../ui';
import { CaptureTokens } from '../capture/CaptureTokens';
import { createProjectNamed } from '../capture/createProject';
import { resolveCapture } from '../capture/resolveCapture';
import { SuggestionList } from '../capture/SuggestionList';
import { useSuggestions } from '../capture/useSuggestions';
import { toastWithUndo } from './actions';
import { projectColor, useProjectRefs } from './projectRefs';

interface AddTaskProps {
  /** Due date for tasks that don't name one (Today adds for today). */
  due?: string;
  /** Project for tasks that don't name one (a project's own list). */
  project?: string;
  placeholder?: string;
}

/**
 * An inline "Add a task…" line that understands the capture syntax, with
 * `@project` and `#tag` completion. ⏎ adds and stays ready for the next.
 */
export function AddTask({ due, project, placeholder = 'Add a task… (tomorrow, every tue, ~30m, #tag, @project)' }: AddTaskProps) {
  const [text, setText] = useState('');
  const projects = useProjectRefs();
  const resolved = useMemo(() => (text.trim() ? resolveCapture(text, projects.open) : null), [text, projects]);
  const suggestions = useSuggestions(text, setText);

  const add = async (draft: ArtifactDraft, typed: string): Promise<boolean> => {
    setText('');
    try {
      await create(
        { ...draft, type: ArtifactType.TODO, due: draft.due ?? due, project: draft.project ?? project },
        `Add “${draft.title}”`,
      );
      return true;
    } catch (error) {
      setText(typed);
      toast.error(error instanceof Error ? error.message : 'Could not add the task');
      return false;
    }
  };

  const submit = () => {
    if (resolved) void add(resolved.draft, text);
  };

  const createAndAdd = async (name: string) => {
    const typed = text;
    try {
      const created = await createProjectNamed(name);
      const ref = { id: created.id, title: created.title, filePath: created.filePath, color: projectColor(created), closed: false };
      if (await add(resolveCapture(typed, [...projects.open, ref]).draft, typed)) {
        toastWithUndo(`Added to new project “${name}”`, undefined, 2);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the project');
    }
  };

  const tokens = resolved?.tokens.filter((token) => token.kind !== 'project' || !project) ?? [];

  return (
    <div className="flex min-h-10 items-center gap-2 rounded-md pl-2 pr-2 transition-colors duration-fast hover:bg-text/5 focus-within:bg-text/5">
      <span className="grid size-6 shrink-0 place-items-center text-text-tertiary">
        <Icon icon={Plus} />
      </span>
      <SuggestionList {...suggestions.list} open={suggestions.open} onClose={suggestions.close}>
        <Input
          variant="ghost"
          value={text}
          {...suggestions.fieldProps}
          onChange={(event) => {
            setText(event.target.value);
            suggestions.onChange(event);
          }}
          onKeyDown={(event) => {
            if (suggestions.onKeyDown(event)) return;
            if (event.key === 'Enter') {
              event.preventDefault();
              submit();
            } else if (event.key === 'Escape' && text) {
              event.stopPropagation();
              setText('');
            }
          }}
          placeholder={placeholder}
          aria-label="Add a task"
          aria-autocomplete="list"
          aria-expanded={suggestions.open}
          className="w-full px-0 hover:bg-transparent focus-visible:bg-transparent"
        />
      </SuggestionList>
      <CaptureTokens tokens={tokens} onCreateProject={(name) => void createAndAdd(name)} className="shrink-0" />
    </div>
  );
}
