import { Editor } from '@tiptap/react';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import { ToolbarButton } from './toolbar-button';

interface TextAlignButtonProps {
  editor: Editor;
  align: 'left' | 'center' | 'right' | 'justify';
}

export function TextAlignButton({ editor, align }: TextAlignButtonProps) {
  const icons = {
    left: AlignLeft,
    center: AlignCenter,
    right: AlignRight,
    justify: AlignJustify,
  };

  const Icon = icons[align];
  const isActive = editor.isActive({ textAlign: align });

  const onClick = () => {
    editor.chain().focus().setTextAlign(align).run();
  };

  return (
    <ToolbarButton
      editor={editor}
      onClick={onClick}
      isActive={isActive}
      title={`Align ${align.charAt(0).toUpperCase() + align.slice(1)}`}
    >
      <Icon className="h-4 w-4" />
    </ToolbarButton>
  );
}
