import { Editor } from '@tiptap/react';
import { Separator } from '../../ui/separator';
import { MarkButton } from './mark-button';
import { HeadingButton } from './heading-button';
import { ListButton } from './list-button';
import { TextAlignButton } from './text-align-button';
import { CodeBlockButton } from './code-block-button';
import { BlockquoteButton } from './blockquote-button';
import { UndoRedoButton } from './undo-redo-button';
import { LinkPopover } from './link-popover';
import { ImageUploadButton } from './image-upload-button';
import { Table as TableIcon } from 'lucide-react';
import { Button } from '../../ui/button'

interface ToolbarProps {
  editor: Editor;
}

export function Toolbar({ editor }: ToolbarProps) {
  return (
    <div className="flex items-center gap-1 p-2 border-b border-border  flex-wrap bg-transparent">
      {/* Text Formatting */}
      <MarkButton editor={editor} mark="bold" />
      <MarkButton editor={editor} mark="italic" />
      <MarkButton editor={editor} mark="underline" />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Headings */}
      <HeadingButton editor={editor} level={1} />
      <HeadingButton editor={editor} level={2} />
      <HeadingButton editor={editor} level={3} />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Lists */}
      <ListButton editor={editor} listType="bulletList" />
      <ListButton editor={editor} listType="orderedList" />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Code */}
      <CodeBlockButton editor={editor} />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Blockquote */}
      <BlockquoteButton editor={editor} />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Text Alignment */}
      <TextAlignButton editor={editor} align="left" />
      <TextAlignButton editor={editor} align="center" />
      <TextAlignButton editor={editor} align="right" />
      <TextAlignButton editor={editor} align="justify" />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Table */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => {
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        }}
        className="h-8 w-8 p-0"
        title="Insert Table"
      >
        <TableIcon className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Link */}
      <LinkPopover editor={editor} />

      {/* Image */}
      <ImageUploadButton editor={editor} />

      <div className="flex-1" />

      {/* Undo/Redo */}
      <UndoRedoButton editor={editor} action="undo" />
      <UndoRedoButton editor={editor} action="redo" />
    </div>
  );
}
