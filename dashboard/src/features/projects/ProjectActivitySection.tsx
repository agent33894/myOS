import type { ProjectWithStats } from '../../data/projects';
import type { ArtifactSummary } from '@shared/types';
import { deriveActivity } from './projectActivity';
import { shortDate } from './format';

interface ProjectActivitySectionProps {
  project: ProjectWithStats;
  /** Opening an entry keeps it inside the workbench — the caller owns selection. */
  onOpen: (artifact: ArtifactSummary) => void;
}

/** The ledger: recent completions, filings, and edits from real stamps only. */
export function ProjectActivitySection({ project, onOpen }: ProjectActivitySectionProps) {
  const entries = deriveActivity(project);

  if (entries.length === 0) return null;

  return (
    <section className="chronicle-project-activity" aria-label="Recent activity">
      <div className="chronicle-section-label">Activity</div>
      {entries.map((entry) => (
        <div key={entry.artifact?.id ?? 'project-created'} className="chronicle-activity-row">
          <span className="chronicle-activity-date">{shortDate(entry.date)}</span>
          <div className="chronicle-activity-body">
            <span className="chronicle-activity-kind">{entry.garnish}</span>
            {entry.artifact ? (
              <button
                className="chronicle-activity-title focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                onClick={() => onOpen(entry.artifact!)}
              >
                {entry.title}
              </button>
            ) : (
              <span className="chronicle-activity-title">{entry.title}</span>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
