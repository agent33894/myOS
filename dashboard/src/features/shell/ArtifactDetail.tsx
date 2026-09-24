import type { ArtifactSummary } from '@shared/types';
import LivingPageDetail from '../living-page/LivingPageDetail';

/**
 * The detail pane dispatcher. Every artifact type gets a Living surface —
 * the pane is the document, always writable, autosave-only, no edit mode,
 * no Open button: every artifact uses the editable Living Page.
 */
export function ArtifactDetail({
  artifact,
  onDeleted,
}: {
  artifact: ArtifactSummary | null;
  onDeleted?: () => void;
}) {
  if (!artifact) {
    return (
      <div className="grid h-full place-items-center text-base text-text-secondary">
        <p>Nothing selected.</p>
      </div>
    );
  }

  return <LivingPageDetail artifact={artifact} onDeleted={onDeleted} />;
}
