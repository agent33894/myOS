import { Editor } from '@tiptap/react';
import { Quote } from 'lucide-react';
import { ToolbarButton } from './toolbar-button';

interface BlockquoteButtonProps {
  editor: Editor;
}

export function BlockquoteButton({ editor }: BlockquoteButtonProps) {
  const isActive = editor.isActive('blockquote');

  const onClick = () => {
    editor.chain().focus().toggleBlockquote().run();
  };

  return (
    <ToolbarButton
      editor={editor}
      onClick={onClick}
      isActive={isActive}
      title="Quote"
    >
      <Quote className="h-4 w-4" />
    </ToolbarButton>
  );
}
