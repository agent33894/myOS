import type { Artifact } from '../../types/artifacts';
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
  artifact: Artifact | null;
  onDeleted?: () => void;
}) {
  if (!artifact) {
    return (
      <div className="chronicle-detail-empty">
        <p>Nothing selected.</p>
      </div>
    );
  }

  return <LivingPageDetail artifact={artifact} onDeleted={onDeleted} />;
}
