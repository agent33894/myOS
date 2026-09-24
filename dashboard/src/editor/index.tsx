// Contract between the page and the editor. The implementation behind it is
// being rebuilt; keep this surface stable.
import type { ArtifactType } from '@shared/types';
import TipTapEditor from '../components/artifacts/TipTapEditor';

export interface EditorProps {
  /** Markdown body. Swapping `artifact` swaps the document without remounting. */
  value: string;
  onChange: (markdown: string) => void;
  artifact: { id: string; filePath: string; type: ArtifactType };
  placeholder?: string;
  /** Put the caret in the body once the document is loaded and empty. */
  autoFocusWhenEmpty?: boolean;
}

export function Editor({ value, onChange, artifact, placeholder = 'Start writing…', autoFocusWhenEmpty }: EditorProps) {
  return (
    <TipTapEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      variant="editorial"
      measure="flush"
      minHeight="240px"
      autoFocusWhenEmpty={autoFocusWhenEmpty}
      artifactId={artifact.id}
      artifactFilePath={artifact.filePath}
      artifactType={artifact.type}
    />
  );
}
