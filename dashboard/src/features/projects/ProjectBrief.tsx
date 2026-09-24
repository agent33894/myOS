import type { ProjectWithStats } from '../../data/projects';
import SaveStateIndicator from '../../components/artifacts/SaveStateIndicator';
import { useLivingPageController } from '../living-page/useLivingPageController';
import LivingPageBody from '../living-page/LivingPageBody';
import { ConflictBanner } from '../living-page/ConflictBanner';

/**
 * The project's own page body as a Living Page: always editable, autosaving
 * ambiently. The title itself stays with the header.
 */
export function ProjectBrief({ project }: { project: ProjectWithStats }) {
  const controller = useLivingPageController(project.filePath);

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
      {controller.conflict ? (
        <ConflictBanner onLoadTheirs={controller.loadTheirs} onKeepMine={() => void controller.keepMine()} />
      ) : null}
    </section>
  );
}
