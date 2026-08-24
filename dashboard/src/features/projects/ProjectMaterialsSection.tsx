import type { ProjectWithStats } from '../../hooks/useProjects';
import type { Artifact } from '../../types/artifacts';
import { getTypeIcon, getTypeLabel } from '../../utils/typeIcons';
import { cn } from '../../lib/utils';
import { shortDate } from './format';

interface ProjectMaterialsSectionProps {
  project: ProjectWithStats;
  /** Opening a material keeps it inside the workbench — the caller owns selection. */
  onOpen: (artifact: Artifact) => void;
  selectedPath?: string | null;
}

/** Everything linked to the project that isn't a task, grouped by type. */
export function ProjectMaterialsSection({
  project,
  onOpen,
  selectedPath,
}: ProjectMaterialsSectionProps) {
  if (project.materials.length === 0) {
    return (
      <section className="chronicle-project-materials" aria-label="Project materials">
        <div className="chronicle-section-label">Materials</div>
        <p className="chronicle-materials-empty">
          Nothing filed yet — drag any Library item onto this project in the sidebar.
        </p>
      </section>
    );
  }

  return (
    <section className="chronicle-project-materials" aria-label="Project materials">
      <div className="chronicle-section-label">Materials · {project.materials.length}</div>
      {project.materialsByType.map((group) => {
        const TypeIcon = getTypeIcon(group.type);
        return (
          <div key={group.type} className="chronicle-material-group">
            <div className="chronicle-material-label">
              {getTypeLabel(group.type)} · {group.items.length}
            </div>
            {group.items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'chronicle-task-row',
                  selectedPath === item.filePath && 'is-selected',
                )}
              >
                <span className="chronicle-capture-glyph" aria-hidden="true">
                  <TypeIcon className="h-4 w-4" />
                </span>
                <button className="chronicle-row-body active:scale-[0.98]" onClick={() => onOpen(item)}>
                  <span className="chronicle-row-title">{item.title}</span>
                  <span className="chronicle-row-meta">
                    {[item.status, shortDate(item.updated) ? `edited ${shortDate(item.updated)}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
}
