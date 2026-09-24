// Contract between the page and the editor. The page owns the title,
// properties, and saving; the editor owns the body.
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { EditorView } from '@tiptap/pm/view';
import { EditorContent, useEditor } from '@tiptap/react';
import type { ArtifactType } from '@shared/types';
import { hasPrimaryModifier } from '../lib/platform';
import { BubbleToolbar } from './bubble/BubbleToolbar';
import { createExtensions } from './extensions';
import { FindBar } from './find/FindBar';
import { useLinks } from './links/useLinks';
import { SlashMenu } from './slash/SlashMenu';
import { useAttachFile } from './slash/useAttachFile';
import { useMarkdownSync } from './useMarkdownSync';

export interface EditorProps {
  /** Markdown body. Swapping `artifact` swaps the document without remounting. */
  value: string;
  onChange: (markdown: string) => void;
  artifact: { id: string; filePath: string; type: ArtifactType };
  placeholder?: string;
  /** Put the caret in the body once the document is loaded and empty. */
  autoFocusWhenEmpty?: boolean;
}

const isTyping = (element: Element | null) =>
  element instanceof HTMLElement && (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName));

export function Editor({ value, onChange, artifact, placeholder = 'Start writing, or press / for blocks', autoFocusWhenEmpty }: EditorProps) {
  const [slashKeys] = useState<{ current: ((event: KeyboardEvent) => boolean) | null }>({ current: null });
  const [initialContent] = useState(value);
  const [linkOpen, setLinkOpen] = useState(false);
  const [find, setFind] = useState<{ query: string; opened: number } | null>(null);
  const clickRef = useRef<(event: MouseEvent) => boolean>(() => false);

  const extensions = useMemo(() => createExtensions({ placeholder, slashKeys }), []);
  const editorProps = useMemo(
    () => ({
      attributes: { class: 'prose', role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Page body' },
      handleClick: (_view: EditorView, _pos: number, event: MouseEvent) => clickRef.current(event),
      handleKeyDown: (view: EditorView, event: KeyboardEvent) => {
        if (!hasPrimaryModifier(event) || event.altKey) return false;
        const key = event.key.toLowerCase();
        const { selection, doc } = view.state;
        // ⌘F and ⌘K belong to the editor while it has focus; stop them reaching the app shortcuts.
        if (key === 'f' && !event.shiftKey) {
          event.stopPropagation();
          setFind({ query: selection.empty ? '' : doc.textBetween(selection.from, selection.to), opened: Date.now() });
          return true;
        }
        if (key === 'k' && !selection.empty) {
          event.stopPropagation();
          setLinkOpen(true);
          return true;
        }
        return false;
      },
    }),
    [],
  );

  const editor = useEditor({
    extensions,
    content: initialContent,
    contentType: 'markdown',
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    editorProps,
  });

  useMarkdownSync(editor, value, artifact.id, onChange);
  const links = useLinks(editor, artifact);
  clickRef.current = links.handleClick;
  const attachFile = useAttachFile(editor, artifact);

  useEffect(() => {
    const reset = () => setLinkOpen(false);
    editor.on('selectionUpdate', reset);
    return () => {
      editor.off('selectionUpdate', reset);
    };
  }, [editor]);

  // A new, empty page puts the caret in the body, unless the user is already typing elsewhere (the title).
  useEffect(() => {
    if (!autoFocusWhenEmpty || value.trim() || editor.isFocused || isTyping(document.activeElement)) return;
    const timer = window.setTimeout(() => editor.commands.focus('start'), 0);
    return () => window.clearTimeout(timer);
  }, [editor, artifact.id, autoFocusWhenEmpty, value === '']);

  // Clicking the empty space below the last block continues writing at the end.
  const continueAtEnd = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !editor.isEditable) return;
    event.preventDefault();
    editor.commands.focus('end');
  };

  return (
    <div className="relative flex flex-col">
      {find ? (
        <div className="sticky top-2 z-sticky flex h-0 items-start justify-end overflow-visible">
          <FindBar key={find.opened} editor={editor} initialQuery={find.query} onClose={() => setFind(null)} />
        </div>
      ) : null}
      <EditorContent editor={editor} className="flex-1 cursor-text" onMouseDown={continueAtEnd} />
      <BubbleToolbar editor={editor} linkRequest={{ open: linkOpen, setOpen: setLinkOpen }} />
      <SlashMenu editor={editor} keyHandler={slashKeys} onAttachFile={attachFile} />
      {links.layer}
    </div>
  );
}
