import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import { Bold, Italic, Underline, Link, Heading1, Heading2, Heading3, Code } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button'

interface FloatingToolbarProps {
  editor: Editor;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function FloatingToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-2 transition-colors',
        isActive && 'is-active',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span className={cn('h-4 w-4 block', isActive && 'text-accent-text')}>
        {children}
      </span>
    </Button>
  );
}

export function FloatingToolbar({ editor }: FloatingToolbarProps) {
  if (!editor) {
    return null;
  }

  return (
    <BubbleMenu
      editor={editor}
      options={{
        placement: 'top',
        offset: 8,
      }}
      className="floating-toolbar"
    >
      {/* Text Formatting */}
      <FloatingToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </FloatingToolbarButton>

      <FloatingToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </FloatingToolbarButton>

      <FloatingToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </FloatingToolbarButton>

      <div className="w-px h-4 bg-secondary  mx-1" />

      {/* Headings */}
      <FloatingToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </FloatingToolbarButton>

      <FloatingToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </FloatingToolbarButton>

      <FloatingToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </FloatingToolbarButton>

      <div className="w-px h-4 bg-secondary  mx-1" />

      {/* Code */}
      <FloatingToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="Inline Code"
      >
        <Code className="h-4 w-4" />
      </FloatingToolbarButton>

      {/* Link */}
      <FloatingToolbarButton
        onClick={() => {
          const previousUrl = editor.getAttributes('link').href;
          const url = window.prompt('URL', previousUrl);

          if (url === null) {
            return;
          }

          if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
          }

          editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }}
        isActive={editor.isActive('link')}
        title="Add Link"
      >
        <Link className="h-4 w-4" />
      </FloatingToolbarButton>
    </BubbleMenu>
  );
}
