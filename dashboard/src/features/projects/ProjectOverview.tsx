import { useEffect, useRef, useState } from 'react';
import type { ProjectWithStats } from '../../hooks/useProjects';
import type { Artifact } from '../../types/artifacts';
import { shortDate } from './format';
import { ProjectActivitySection } from './ProjectActivitySection';
import { ProjectBrief } from './ProjectBrief';
import { useProjectRename } from './projectRename';
import LinkedFrom from '../living-page/LinkedFrom';

interface ProjectOverviewProps {
  project: ProjectWithStats;
  onOpenItem: (artifact: Artifact) => void;
}

/**
 * The project's own page in the workbench center: an in-place editable title,
 * the dateline, then the brief (a Living Page) and the activity ledger at
 * reading measure. Status, deadline, and vitals live in the inspector.
 */
export function ProjectOverview({ project, onOpenItem }: ProjectOverviewProps) {
  const { rename } = useProjectRename();
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
      {dateline ? <p className="chronicle-detail-meta">{dateline}</p> : null}
      <ProjectBrief project={project} />
      <ProjectActivitySection project={project} onOpen={onOpenItem} />
      <LinkedFrom artifact={project} />
    </div>
  );
}
