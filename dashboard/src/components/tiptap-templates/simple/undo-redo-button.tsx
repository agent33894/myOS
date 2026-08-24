import { Editor } from '@tiptap/react';
import { Undo, Redo } from 'lucide-react';
import { ToolbarButton } from './toolbar-button';

interface UndoRedoButtonProps {
  editor: Editor;
  action: 'undo' | 'redo';
}

export function UndoRedoButton({ editor, action }: UndoRedoButtonProps) {
  const Icon = action === 'undo' ? Undo : Redo;
  const isUndo = action === 'undo';
  const canDo = isUndo
    ? editor.can().chain().focus().undo().run()
    : editor.can().chain().focus().redo().run();

  const onClick = () => {
    if (isUndo) {
      editor.chain().focus().undo().run();
    } else {
      editor.chain().focus().redo().run();
    }
  };

  return (
    <ToolbarButton
      editor={editor}
      onClick={onClick}
      disabled={!canDo}
      title={isUndo ? 'Undo (Ctrl+Z)' : 'Redo (Ctrl+Y)'}
    >
      <Icon className="h-4 w-4" />
    </ToolbarButton>
  );
}
