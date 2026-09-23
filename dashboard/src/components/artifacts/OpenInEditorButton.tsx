import { FileEdit } from 'lucide-react';
import { toast } from 'sonner';
import type { Artifact } from '../../types/artifacts';

/** Raw Markdown editing lives in the user's own editor, not a second mode here. */
export function OpenInEditorButton({ artifact }: { artifact: Artifact }) {
  return (
    <button
      type="button"
      className="chronicle-detail-more"
      aria-label={`Open ${artifact.title} in your default editor`}
      title="Open in default editor"
      onClick={() =>
        void window.electronAPI
          .openArtifactFile(artifact.filePath)
          .catch((error: unknown) =>
            toast.error(error instanceof Error ? error.message : 'Could not open the file'),
          )
      }
    >
      <FileEdit className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
