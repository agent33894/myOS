import { useEffect, useRef, useState } from 'react';
import type { ProjectWithStats } from '../../data/projects';
import type { ArtifactSummary } from '@shared/types';
import { shortDate } from './format';
import { ProjectActivitySection } from './ProjectActivitySection';
import { ProjectBrief } from './ProjectBrief';
import { useProjectRename } from './projectRename';
import { useProjectStatus } from './projectMutations';
import LinkedFrom from '../living-page/LinkedFrom';

interface ProjectOverviewProps {
  project: ProjectWithStats;
  onOpenItem: (artifact: ArtifactSummary) => void;
}

/**
 * The project's own page in the workbench center: an in-place editable title,
 * the dateline, then the brief (a Living Page) and the activity ledger at
 * reading measure. Status, deadline, and vitals live in the inspector; a
 * closed project says so under its title, with a one-click way back.
 */
export function ProjectOverview({ project, onOpenItem }: ProjectOverviewProps) {
  const { rename } = useProjectRename();
  const { setProjectStatus } = useProjectStatus();
  const [draft, setDraft] = useState(project.title);
  // Escape reverts the draft; the guard keeps the following blur from re-committing.
  const revertingRef = useRef(false);

  useEffect(() => {
    setDraft(project.title);
  }, [project.id, project.title]);

  const commit = (value: string) => {
    const title = value.trim();
    if (!title || title === project.title) {
      setDraft(project.title);
      return;
    }
    void rename(project, title);
  };

  const closedLabel = project.isClosed
    ? [
        String(project.status).replace(/^./, (c) => c.toUpperCase()),
        shortDate(project.completedDate),
      ]
        .filter(Boolean)
        .join(' ')
    : null;

  const dateline = [
    shortDate(project.created) ? `Created ${shortDate(project.created)}` : null,
    shortDate(project.lastActivity) ? `Last activity ${shortDate(project.lastActivity)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="chronicle-workbench-overview">
      <div className="chronicle-detail-title-row">
        <input
          className="chronicle-project-title-input"
          value={draft}
          aria-label="Project title"
          spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') {
              revertingRef.current = true;
              setDraft(project.title);
              event.currentTarget.blur();
            }
          }}
          onBlur={(event) => {
            if (revertingRef.current) {
              revertingRef.current = false;
              return;
            }
            commit(event.currentTarget.value);
          }}
        />
      </div>
      {dateline || closedLabel ? (
        <p className="chronicle-detail-meta">
          {closedLabel ? (
            <>
              <span className="chronicle-closed-state">{closedLabel}</span>
              {dateline ? ' · ' : null}
            </>
          ) : null}
          {dateline}
          {closedLabel ? (
            <button
              type="button"
              className="chronicle-heading-action chronicle-reopen-action"
              onClick={() => setProjectStatus(project.id, 'active')}
            >
              Reopen
            </button>
          ) : null}
        </p>
      ) : null}
      <ProjectBrief project={project} />
      <ProjectActivitySection project={project} onOpen={onOpenItem} />
      <LinkedFrom artifact={project} />
    </div>
  );
}
