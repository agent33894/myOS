import { useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { toast } from 'sonner';
import { invoke } from '../../data/ipc';

/** Pick a file, copy it into the workspace's assets, and insert it (images inline, other files as a link). */
export function useAttachFile(editor: Editor, artifact: { id: string; filePath: string }) {
  const busy = useRef(false);
  return async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const result = await invoke('artifacts:attach-asset', { artifactId: artifact.id, artifactFilePath: artifact.filePath });
      if (result.canceled) return;
      editor.chain().focus().insertContent(result.asset.insertMarkdown, { contentType: 'markdown' }).run();
    } catch (error) {
      toast.error(error instanceof Error ? `Couldn’t attach that file: ${error.message}` : 'Couldn’t attach that file');
    } finally {
      busy.current = false;
    }
  };
}
