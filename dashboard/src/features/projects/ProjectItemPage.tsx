import type { Artifact } from '../../types/artifacts';
import { ArtifactType, TodoStatus } from '../../types/artifacts';
import { getTypeLabel } from '../../utils/typeIcons';
import SaveStateIndicator from '../../components/artifacts/SaveStateIndicator';
import { ChronicleCheckmark } from '../today/ChronicleCheckmark';
import { localDateStamp } from '../today/todaySelectors';
import { cn } from '../../lib/utils';
import { useLivingPageController } from '../living-page/useLivingPageController';
import LivingPageBody from '../living-page/LivingPageBody';
import LivingPageTitle from '../living-page/LivingPageTitle';
import { ArtifactDeleteMenu } from '../../components/artifacts/ArtifactDeleteMenu';
import { OpenInEditorButton } from '../../components/artifacts/OpenInEditorButton';
import LinkedFrom from '../living-page/LinkedFrom';

/**
 * An artifact opened inside the workbench center: the same Living Page the
 * Library pane uses (editable title, editorial body, ambient autosave), but
 * without the chips and meta the breadcrumb bar and inspector already carry.
 * Deliberately unkeyed by callers — the controller reloads on artifact.id
 * without remounting the editor.
 */
export function ProjectItemPage({
  artifact,
  onDeleted,
}: {
  artifact: Artifact;
  onDeleted: () => void;
}) {
  const controller = useLivingPageController(artifact);

  const isTodo = artifact.type === ArtifactType.TODO;
  const isDone = artifact.status === TodoStatus.DONE;

  const toggleDone = () => {
    const label = isDone ? `Reopen ${artifact.title}` : `Complete ${artifact.title}`;
    const overrides = isDone
      ? { status: TodoStatus.PENDING, completedDate: undefined }
      : { status: TodoStatus.DONE, completedDate: localDateStamp() };
    void controller.saveNow(overrides, label);
  };

  return (
    <article className="chronicle-workbench-page" aria-label={artifact.title}>
      <div className="chronicle-detail-meta-row">
        <p className="chronicle-detail-meta">
          {[getTypeLabel(artifact.type), artifact.domain || 'unfiled'].join(' · ')}
        </p>
        <div className="chronicle-detail-meta-tools">
          <SaveStateIndicator
            isSaving={controller.isSaving}
            lastSaved={controller.lastSaved}
            hasUnsavedChanges={controller.hasUnsavedChanges}
            isActivelyEditing={controller.isActivelyEditing}
          />
          <OpenInEditorButton artifact={artifact} />
          <ArtifactDeleteMenu
            artifact={artifact}
            disabled={controller.isSaving}
            onDeleteStart={controller.beginDelete}
            onDeleteFailure={controller.cancelDelete}
            onDeleted={onDeleted}
          />
        </div>
      </div>
      <div className="chronicle-detail-title-row">
        {isTodo ? (
          <button
            className={cn('chronicle-detail-completion', isDone && 'is-done')}
            onClick={toggleDone}
            disabled={controller.isSaving}
            aria-label={isDone ? `Reopen ${artifact.title}` : `Complete ${artifact.title}`}
            title={isDone ? 'Reopen' : 'Mark done'}
          >
            <span>
              <ChronicleCheckmark />
            </span>
          </button>
        ) : null}
        <LivingPageTitle value={controller.title} onChange={controller.onTitleChange} />
      </div>
      <div className="chronicle-rule" key={artifact.id} />
      <LivingPageBody
        artifact={artifact}
        body={controller.docBody}
        onChange={controller.onBodyChange}
      />
      <LinkedFrom artifact={artifact} />
    </article>
  );
}
