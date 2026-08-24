import { Editor } from '@tiptap/react';
import { List, ListOrdered } from 'lucide-react';
import { ToolbarButton } from './toolbar-button';

interface ListButtonProps {
  editor: Editor;
  listType: 'bulletList' | 'orderedList';
}

export function ListButton({ editor, listType }: ListButtonProps) {
  const isBullet = listType === 'bulletList';
  const Icon = isBullet ? List : ListOrdered;
  const isActive = editor.isActive(listType);

  const onClick = () => {
    if (isBullet) {
      editor.chain().focus().toggleBulletList().run();
    } else {
      editor.chain().focus().toggleOrderedList().run();
    }
  };

  return (
    <ToolbarButton
      editor={editor}
      onClick={onClick}
      isActive={isActive}
      title={isBullet ? 'Bullet List' : 'Numbered List'}
    >
      <Icon className="h-4 w-4" />
    </ToolbarButton>
  );
}
