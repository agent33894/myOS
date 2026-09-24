import { useNavigate } from 'react-router-dom';
import { toProjectUrl } from '../../app/navigation';
import type { ProjectWithStats } from '../../data/projects';
import { snippet } from '../notes/noteSearch';
import { dayLabel, inSentence } from '../tasks/dates';
import { ProjectDot } from '../tasks/ProjectDot';
import { projectColor } from '../tasks/projectRefs';

/** A project at a glance: name, a line of description, and how far along it is. */
export function ProjectCard({ project }: { project: ProjectWithStats }) {
  const navigate = useNavigate();
  const color = projectColor(project);
  const progress = project.todoProgress;
  const description = snippet(project.searchText, '', project.title);
  const open = () => navigate(toProjectUrl(project.id));
  const next =
    project.overdueCount > 0 ? (
      <span className="text-danger">{project.overdueCount} overdue</span>
    ) : project.nextDue ? (
      <span>Next due {inSentence(dayLabel(project.nextDue))}</span>
    ) : null;

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => event.key === 'Enter' && open()}
      className="flex cursor-default flex-col rounded-lg bg-raised p-4 shadow-raised outline-none transition-shadow duration-base ease-out hover:shadow-overlay focus-visible:ring-2 focus-visible:ring-focus"
    >
      <div className="flex items-center gap-2">
        <ProjectDot color={color} className="size-3" />
        <h3 className="min-w-0 flex-1 truncate text-base font-medium text-text">{project.title}</h3>
      </div>
      <p className="mt-1 min-h-9 line-clamp-2 text-sm text-text-tertiary">{description || 'No description yet.'}</p>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-text/5">
        <div
          className="h-full rounded-full transition-all duration-slow ease-out"
          style={{ width: `${progress?.percentage ?? 0}%`, backgroundColor: color }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-text-tertiary">
        <span>{progress ? `${progress.done} of ${progress.total} done` : 'No tasks yet'}</span>
        {next}
      </div>
    </div>
  );
}
