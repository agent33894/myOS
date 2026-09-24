import type { ArtifactSummary } from '@shared/types';
import TipTapEditor from '../../components/artifacts/TipTapEditor';

interface LivingPageBodyProps {
  artifact: ArtifactSummary;
  body: string | null;
  onChange: (markdown: string) => void;
}

/**
 * The always-writable body of the Living Page. The editor mounts once per
 * pane lifetime — selecting another artifact swaps the document through the
 * value prop instead of remounting the (heavy) TipTap instance.
 */
export default function LivingPageBody({ artifact, body, onChange }: LivingPageBodyProps) {
  return (
    <div className="chronicle-living-body">
      <TipTapEditor
        value={body ?? ''}
        onChange={onChange}
        placeholder="Start writing…"
        variant="editorial"
        measure="flush"
        minHeight="240px"
        artifactId={artifact.id}
        artifactFilePath={artifact.filePath}
        artifactType={artifact.type}
      />
    </div>
  );
}
