import { Editor } from '@tiptap/react';
import { Heading1, Heading2, Heading3 } from 'lucide-react';
import { ToolbarButton } from './toolbar-button';

interface HeadingButtonProps {
  editor: Editor;
  level: 1 | 2 | 3;
}

export function HeadingButton({ editor, level }: HeadingButtonProps) {
  const icons = {
    1: Heading1,
    2: Heading2,
    3: Heading3,
  };

  const Icon = icons[level];
  const isActive = editor.isActive('heading', { level });

  const onClick = () => {
    editor.chain().focus().toggleHeading({ level }).run();
  };

  return (
    <ToolbarButton
      editor={editor}
      onClick={onClick}
      isActive={isActive}
      title={`Heading ${level}`}
    >
      <Icon className="h-4 w-4" />
    </ToolbarButton>
  );
}
