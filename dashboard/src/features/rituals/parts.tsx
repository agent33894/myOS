import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';
import type { ArtifactSummary } from '@shared/types';
import { Icon } from '../../ui';
import { ProjectDot } from '../tasks/ProjectDot';
import { useProjectRefs } from '../tasks/projectRefs';

const DONE_SHOWN = 8;
/** Rows arrive one after another, a short beat apart. */
const STAGGER_MS = 60;

/** A task's project as a dot and name, or a quiet fallback line. */
export function ProjectMeta({ project, fallback }: { project?: string; fallback?: string }) {
  const ref = useProjectRefs().find(project);
  if (!ref) return fallback ? <>{fallback}</> : null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <ProjectDot color={ref.color} />
      {ref.title}
    </span>
  );
}

/** Finished tasks, each springing its check in turn: the peak of a ritual. */
export function DoneList({ tasks }: { tasks: readonly ArtifactSummary[] }) {
  const shown = tasks.slice(0, DONE_SHOWN);
  const rest = tasks.length - shown.length;
  return (
    <ul className="flex flex-col gap-1" aria-label="Done">
      {shown.map((task, index) => (
        <li
          key={task.filePath}
          className="flex items-center gap-3 rounded-md px-3 py-2 animate-slide-up"
          style={{ animationDelay: `${index * STAGGER_MS}ms`, animationFillMode: 'both' }}
        >
          <span
            aria-hidden="true"
            className="grid size-5 shrink-0 place-items-center rounded-full bg-accent text-accent-on animate-check-pop"
            style={{ animationDelay: `${120 + index * STAGGER_MS}ms`, animationFillMode: 'both' }}
          >
            <Icon icon={Check} size="sm" strokeWidth={2.5} />
          </span>
          <span className="min-w-0 flex-1 truncate text-base text-text">{task.title}</span>
          <span className="shrink-0 truncate text-sm text-text-tertiary">
            <ProjectMeta project={task.project} />
          </span>
        </li>
      ))}
      {rest > 0 ? <li className="px-3 pt-1 text-sm text-text-tertiary">and {rest} more</li> : null}
    </ul>
  );
}

/** The ending's few quiet lines about what the ritual did. */
export function Finale({ lines }: { lines: ReadonlyArray<{ icon: LucideIcon; text: string }> }) {
  return (
    <div className="flex flex-col items-center pb-2">
      {lines.length > 0 ? (
        <ul className="flex flex-col items-start gap-2">
          {lines.map((line, index) => (
            <li
              key={line.text}
              className="flex items-center gap-3 text-base text-text-secondary animate-slide-up"
              style={{ animationDelay: `${200 + index * STAGGER_MS}ms`, animationFillMode: 'both' }}
            >
              <Icon icon={line.icon} className="text-text-tertiary" />
              {line.text}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
