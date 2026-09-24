import { useCallback, useRef, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ArtifactType, TodoStatus, type ArtifactSummary } from '@shared/types';
import { toggleComplete } from '../../data/gateway';
import { ConflictBanner } from './ConflictBanner';
import { getTypeLabel } from '../../utils/typeIcons';
import SaveStateIndicator from '../../components/artifacts/SaveStateIndicator';
import EditorialFooter from '../../components/artifacts/EditorialFooter';
import OutlineRail from '../../components/artifacts/outline/OutlineRail';
import { useOutlineHeadings } from '../../components/artifacts/outline/useOutlineHeadings';
import { ChronicleCheckmark } from '../today/ChronicleCheckmark';
import { cn } from '../../lib/utils';
import { useLivingPageController } from './useLivingPageController';
import { useProjectLabel } from '../../hooks/useProjectLabel';
import LivingPageBody from './LivingPageBody';
import LinkedFrom from './LinkedFrom';
import LivingPageTitle from './LivingPageTitle';
import { ArtifactDeleteMenu } from '../../components/artifacts/ArtifactDeleteMenu';
import { OpenInEditorButton } from '../../components/artifacts/OpenInEditorButton';

const PANE_OUTLINE_SCROLL_OFFSET = 40;

/**
 * The Living Page: no modes, no Open button. The pane you select is the
 * document — park the caret and type. Same Chronicle anatomy as the old
 * read-only detail (chips, serif title, garnish meta, rule), but the title is
 * an input and the body is the editorial editor, autosaving ambiently.
 */
export default function LivingPageDetail({
  artifact,
  onDeleted,
}: {
  artifact: ArtifactSummary;
  onDeleted?: () => void;
}) {
  const controller = useLivingPageController(artifact.filePath);
  const projectLabel = useProjectLabel();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRootRef = useRef<HTMLDivElement | null>(null);
  // Local, default-collapsed: the pane is narrower than the workspace and
  // deliberately not coupled to the workspace's persisted outline setting.
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const getScrollContainer = useCallback(() => scrollRef.current, []);

  const outline = useOutlineHeadings({
    content: controller.docBody ?? '',
    title: controller.title,
    enabled: controller.docBody !== null,
    contentRootRef,
    getScrollContainer,
    scrollOffset: PANE_OUTLINE_SCROLL_OFFSET,
  });

  const isTodo = artifact.type === ArtifactType.TODO;
  const isDone = artifact.status === TodoStatus.DONE;

  const toggleDone = () =>
    void toggleComplete(artifact).catch((error: unknown) =>
      toast.error(error instanceof Error ? error.message : 'Could not update the task'),
    );

  const metaLine = [
    new Date(artifact.updated).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    artifact.domain || 'unfiled',
    artifact.due ? `due ${format(new Date(artifact.due), 'MMM d')}` : null,
    isDone && artifact.completedDate
      ? `completed ${format(new Date(`${artifact.completedDate.slice(0, 10)}T00:00:00`), 'MMM d')}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="chronicle-living-page">
      <div className="chronicle-living-row">
        <OutlineRail outline={outline} isOpen={isOutlineOpen} onOpenChange={setIsOutlineOpen} />
        <div ref={scrollRef} className="chronicle-detail chronicle-living-scroll custom-scrollbar">
          <div className="chronicle-detail-tags">
            <span>{getTypeLabel(artifact.type)}</span>
            {artifact.status ? <span>{artifact.status}</span> : null}
            {artifact.project ? <span>{projectLabel(artifact.project)}</span> : null}
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
          <div className="chronicle-detail-meta-row">
            <p className="chronicle-detail-meta">{metaLine}</p>
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
                onDeleteStart={controller.saveNow}
                onDeleted={onDeleted}
              />
            </div>
          </div>
          <div className="chronicle-rule" key={artifact.id} />
          <div ref={contentRootRef}>
            <LivingPageBody
              artifact={artifact}
              body={controller.docBody}
              onChange={controller.onBodyChange}
            />
          </div>
          <LinkedFrom artifact={artifact} />
        </div>
      </div>
      <EditorialFooter content={controller.docBody ?? ''} />
      {controller.conflict ? (
        <ConflictBanner onLoadTheirs={controller.loadTheirs} onKeepMine={() => void controller.keepMine()} />
      ) : null}
    </article>
  );
}
