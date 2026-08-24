import { Editor } from '@tiptap/react';
import { Bold, Italic, Underline } from 'lucide-react';
import { ToolbarButton } from './toolbar-button';

interface MarkButtonProps {
  editor: Editor;
  mark: 'bold' | 'italic' | 'underline';
}

export function MarkButton({ editor, mark }: MarkButtonProps) {
  const icons = {
    bold: Bold,
    italic: Italic,
    underline: Underline,
  };

  const Icon = icons[mark];
  const isActive = editor.isActive(mark);

  const onClick = () => {
    if (mark === 'bold') {
      editor.chain().focus().toggleBold().run();
    } else if (mark === 'italic') {
      editor.chain().focus().toggleItalic().run();
    } else if (mark === 'underline') {
      editor.chain().focus().toggleUnderline().run();
    }
  };

  return (
    <ToolbarButton
      editor={editor}
      onClick={onClick}
      isActive={isActive}
      disabled={!editor.can().chain().focus().toggleBold().run()}
      title={`${mark.charAt(0).toUpperCase() + mark.slice(1)} (Ctrl+${mark === 'bold' ? 'B' : mark === 'italic' ? 'I' : 'U'})`}
    >
      <Icon className="h-4 w-4" />
    </ToolbarButton>
  );
}
