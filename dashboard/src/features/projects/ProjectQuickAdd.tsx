import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { ProjectWithStats } from '../../data/projects';
import { parseCapture } from '@shared/inbox';
import { ArtifactType } from '@shared/types';
import { create } from '../../data/gateway';
import { shortDate } from './format';

/**
 * A quiet ghost row: type a task, Enter files it under this project.
 * Natural-language garnish is parsed out: `!high`, `#tag`, today / tomorrow /
 * next week / in N days, and a bare `!` to flag.
 */
export function ProjectQuickAdd({ project }: { project: ProjectWithStats }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Sidebar "New task in project" lands here with ?newtask=1: focus, then
  // strip the one-shot param so refresh/back doesn't re-trigger it.
  useEffect(() => {
    if (searchParams.get('newtask') !== '1') return;
    inputRef.current?.focus();
    const next = new URLSearchParams(searchParams);
    next.delete('newtask');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const hint = useMemo(() => {
    const input = value.trim();
    if (!input) return null;
    const parsed = parseCapture(input);
    const parts = [
      parsed.due ? `due ${shortDate(parsed.due)}` : null,
      parsed.priority ? `${parsed.priority} priority` : null,
      parsed.flagged ? 'flagged' : null,
      ...parsed.tags.map((tag) => `#${tag}`),
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : null;
  }, [value]);

  const submit = async () => {
    const input = value.trim();
    if (!input || isPending) return;
    setIsPending(true);
    try {
      const parsed = parseCapture(input);
      // Link by project id, which survives renames; the task inherits the project's domain.
      await create(
        {
          type: ArtifactType.TODO,
          title: parsed.title,
          project: project.id,
          priority: parsed.priority,
          due: parsed.due,
          tags: parsed.tags,
          flagged: parsed.flagged || undefined,
        },
        `Add “${parsed.title}” to ${project.title}`,
      );
      setValue('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add task');
    } finally {
      setIsPending(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="chronicle-project-quickadd">
      <span className="chronicle-capture-glyph" aria-hidden="true">
        <Plus className="h-4 w-4" />
      </span>
      <div className="chronicle-quickadd-body">
        <input
          ref={inputRef}
          value={value}
          placeholder="Add a task… (!high, #tag, tomorrow)"
          disabled={isPending}
          aria-label={`Add a task to ${project.title}`}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void submit();
            if (event.key === 'Escape') setValue('');
          }}
        />
        {hint ? (
          <span className="chronicle-quickadd-hint" aria-live="polite">
            {hint}
          </span>
        ) : null}
      </div>
    </div>
  );
}
