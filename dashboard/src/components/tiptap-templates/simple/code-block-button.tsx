import { Editor } from '@tiptap/react';
import { Code2 } from 'lucide-react';
import { ToolbarButton } from './toolbar-button';

interface CodeBlockButtonProps {
  editor: Editor;
}

export function CodeBlockButton({ editor }: CodeBlockButtonProps) {
  const isActive = editor.isActive('codeBlock');

  const onClick = () => {
    editor.chain().focus().toggleCodeBlock().run();
  };

  return (
    <ToolbarButton
      editor={editor}
      onClick={onClick}
      isActive={isActive}
      title="Code Block"
    >
      <Code2 className="h-4 w-4" />
    </ToolbarButton>
  );
}
