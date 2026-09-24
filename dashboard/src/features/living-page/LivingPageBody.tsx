import type { ArtifactSummary } from '@shared/types';
import { Editor } from '../../editor';

export default function LivingPageBody({ artifact, body, onChange }: {
  artifact: ArtifactSummary;
  body: string | null;
  onChange: (markdown: string) => void;
}) {
  return (
    <div className="chronicle-living-body">
      <Editor value={body ?? ''} onChange={onChange} artifact={artifact} />
    </div>
  );
}
