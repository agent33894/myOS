import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Domain } from '@shared/types';
import { useCreateProject } from './useCreateProject';

interface ProjectCreateRowProps {
  onCreated: (projectId: string) => void;
  /** Increment to pull keyboard focus into the input (e.g. from `?create=1`). */
  focusToken?: number;
}

/** A ghost row at the foot of the Active section: type a title, Enter files a project. */
export function ProjectCreateRow({ onCreated, focusToken }: ProjectCreateRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const { createProject, isPending } = useCreateProject();

  useEffect(() => {
    if (focusToken) inputRef.current?.focus();
  }, [focusToken]);

  const submit = async () => {
    const title = value.trim();
    if (!title || isPending) return;
    const created = await createProject({ title, domain: Domain.WORK });
    if (created) {
      setValue('');
      onCreated(created.id);
    }
    inputRef.current?.focus();
  };

  return (
    <div className="chronicle-task-row chronicle-project-newrow">
      <span className="chronicle-capture-glyph" aria-hidden="true">
        <Plus className="h-4 w-4" />
      </span>
      <input
        ref={inputRef}
        value={value}
        placeholder="New project…"
        disabled={isPending}
        aria-label="Create a project"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') void submit();
          if (event.key === 'Escape') setValue('');
        }}
      />
    </div>
  );
}
