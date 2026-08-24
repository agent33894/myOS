import type { ProjectWithStats } from '../../hooks/useProjects';
import SaveStateIndicator from '../../components/artifacts/SaveStateIndicator';
import { useLivingPageController } from '../living-page/useLivingPageController';
import LivingPageBody from '../living-page/LivingPageBody';

/**
 * The project's own document (Intent/Outcomes/Rationale) as a Living Page: always
 * editable, autosaving ambiently. The controller owns load, title-echo rejoin,
 * and watcher-echo suppression; the title itself stays with the header.
 */
export function ProjectBrief({ project }: { project: ProjectWithStats }) {
  const controller = useLivingPageController(project);

  return (
    <section className="chronicle-project-brief" aria-label="Project brief">
      <div className="chronicle-project-brief-head">
        <span className="chronicle-section-label">Brief</span>
        <SaveStateIndicator
          isSaving={controller.isSaving}
          lastSaved={controller.lastSaved}
          hasUnsavedChanges={controller.hasUnsavedChanges}
          isActivelyEditing={controller.isActivelyEditing}
        />
      </div>
      <LivingPageBody artifact={project} body={controller.docBody} onChange={controller.onBodyChange} />
    </section>
  );
}
