import { FileEdit } from 'lucide-react';
import { toast } from 'sonner';
import { invoke } from '../../data/ipc';
import type { ArtifactSummary } from '@shared/types';

/** Raw Markdown editing lives in the user's own editor, not a second mode here. */
export function OpenInEditorButton({ artifact }: { artifact: ArtifactSummary }) {
  return (
    <button
      type="button"
      className="chronicle-detail-more"
      aria-label={`Open ${artifact.title} in your default editor`}
      title="Open in default editor"
      onClick={() =>
        void invoke('shell:open-in-editor', artifact.filePath).catch((error: unknown) =>
            toast.error(error instanceof Error ? error.message : 'Could not open the file'),
          )
      }
    >
      <FileEdit className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
