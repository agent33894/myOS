// Contract between the note tab and the editor. The tab owns the name,
// properties, and saving; the editor owns the body.
import { lazy, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { EditorView } from '@tiptap/pm/view';
import { createPortal } from 'react-dom';
import { EditorContent, useEditor } from '@tiptap/react';
import { hasPrimaryModifier } from '../lib/platform';
import { useUIStore } from '../store/ui';
import { cn } from '../ui';
import { BubbleToolbar } from './bubble/BubbleToolbar';
import { createExtensions } from './extensions';
import { FindBar } from './find/FindBar';
import { setFocusMode } from './focus/focus';
import { LinkSuggestMenu } from './links/LinkSuggestMenu';
import { useLinks } from './links/useLinks';
import { SlashMenu } from './slash/SlashMenu';
import { useAttachFile } from './slash/useAttachFile';
import { taskClickAt, toggleInDocument, type TaskClick } from './tasks/taskClicks';
import { useEditorBridge } from './useEditorBridge';
import { useMarkdownSync } from './useMarkdownSync';
import './editor.css';

export interface EditorProps {
  /** Markdown body. Swapping `note` swaps the document without remounting. */
  value: string;
  onChange: (markdown: string) => void;
  note: { path: string };
  placeholder?: string;
  /** Put the caret in the body once the note is loaded and empty. */
  autoFocusWhenEmpty?: boolean;
  /** Where the find bar docks: the note's pinned top bar (null until it mounts). */
  findSlot: HTMLElement | null;
  /** Show the document without editing it. */
  readOnly?: boolean;
  /**
   * A task checkbox was clicked. The host checks it off through the task line
   * operation and resolves true; false leaves it to the editor, which flips
   * the checkbox in the document.
   */
  onTaskToggle?: (click: TaskClick) => Promise<boolean>;
  /** Body line to put the caret on once loaded (a switch from source mode). */
  initialLine?: number;
}

export type { TaskClick } from './tasks/taskClicks';

/** Markdown source mode (CodeMirror), loaded the first time a note is shown as source. */
export const SourceEditor = lazy(() => import('./source/SourceEditor'));

const isTyping = (element: Element | null) =>
  element instanceof HTMLElement && (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName));

export function Editor({
  value,
  onChange,
  note,
  placeholder = 'Start writing, or press / for blocks',
  autoFocusWhenEmpty,
  findSlot,
  readOnly = false,
  onTaskToggle,
  initialLine,
}: EditorProps) {
  const [slashKeys] = useState<{ current: ((event: KeyboardEvent) => boolean) | null }>({ current: null });
  const [linkKeys] = useState<{ current: ((event: KeyboardEvent) => boolean) | null }>({ current: null });
  const focusMode = useUIStore((state) => state.focusMode) && !readOnly;
  // Focus mode also dims paragraphs other than the one being written.
  const dimParagraphs = true;
  const [initialContent] = useState(value);
  const [linkOpen, setLinkOpen] = useState(false);
  const [find, setFind] = useState<{ query: string; opened: number } | null>(null);
  const clickRef = useRef<(event: MouseEvent) => boolean>(() => false);

  const extensions = useMemo(() => createExtensions({ placeholder, slashKeys, linkKeys }), []);
  const editorProps = useMemo(
    () => ({
      attributes: { class: 'prose', role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Note body' },
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
    editable: !readOnly,
    shouldRerenderOnTransaction: false,
    editorProps,
  });

  // Views inside the note are told which note they sit in.
  editor.storage.viewFence.sourcePath = note.path;
  const sync = useMarkdownSync(editor, value, note.path, onChange);
  const syncRef = useRef(sync);
  syncRef.current = sync;
  useEditorBridge(editor, note.path, value, initialLine);
  const links = useLinks(editor, note.path);
  const taskToggle = useRef(onTaskToggle);
  taskToggle.current = onTaskToggle;

  // Checking a task goes through the task line operation (✅ date, repeats), never a
  // re-serialize of the list. The capture listener stops TipTap's own toggle.
  useEffect(() => {
    const dom = editor.view.dom;
    const onClick = (event: MouseEvent) => {
      const click = taskClickAt(editor.view, event.target);
      if (!click) return;
      event.preventDefault();
      event.stopPropagation();
      if (!editor.isEditable) return;
      click.line = syncRef.current?.taskLine(click.pos) ?? null;
      const handled = taskToggle.current && click.ordinal >= 0 ? taskToggle.current(click) : Promise.resolve(false);
      void handled.then((done) => {
        if (!done && !editor.isDestroyed) toggleInDocument(editor.view, click);
      });
    };
    dom.addEventListener('click', onClick, true);
    return () => dom.removeEventListener('click', onClick, true);
  }, [editor]);
  clickRef.current = links.handleClick;
  const attachFile = useAttachFile(editor, note.path);

  useEffect(() => {
    const reset = () => setLinkOpen(false);
    editor.on('selectionUpdate', reset);
    return () => {
      editor.off('selectionUpdate', reset);
    };
  }, [editor]);

  useEffect(() => {
    if (editor.isDestroyed) return;
    editor.view.dispatch(setFocusMode(editor.state.tr, { typewriter: focusMode, dim: focusMode && dimParagraphs }));
  }, [editor, focusMode, dimParagraphs]);

  // A new, empty page puts the caret in the body, unless the user is already typing elsewhere (the title).
  useEffect(() => {
    if (!autoFocusWhenEmpty || readOnly || value.trim() || editor.isFocused || isTyping(document.activeElement)) return;
    const timer = window.setTimeout(() => editor.commands.focus('start'), 0);
    return () => window.clearTimeout(timer);
  }, [editor, note.path, autoFocusWhenEmpty, value === '']);

  const findBar = find ? (
    <FindBar key={find.opened} editor={editor} initialQuery={find.query} onClose={() => setFind(null)} />
  ) : null;

  // Clicking the empty space below the last block continues writing at the end.
  const continueAtEnd = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !editor.isEditable) return;
    event.preventDefault();
    editor.commands.focus('end');
  };

  return (
    <div className={cn('relative flex flex-col', focusMode && 'editor-focus', focusMode && dimParagraphs && 'editor-focus-dim')}>
      {findBar && findSlot ? createPortal(findBar, findSlot) : null}
      <EditorContent editor={editor} className={cn('flex-1', !readOnly && 'cursor-text')} onMouseDown={continueAtEnd} />
      {readOnly ? null : (
        <>
          <BubbleToolbar editor={editor} linkRequest={{ open: linkOpen, setOpen: setLinkOpen }} />
          <SlashMenu editor={editor} keyHandler={slashKeys} onAttachFile={attachFile} />
          <LinkSuggestMenu editor={editor} filePath={note.path} keyHandler={linkKeys} />
        </>
      )}
      {links.layer}
    </div>
  );
}
