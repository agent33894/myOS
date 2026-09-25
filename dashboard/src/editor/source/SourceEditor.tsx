import { useEffect, useMemo, useRef } from 'react';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { bracketMatching } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { Annotation, Compartment, EditorState, Transaction } from '@codemirror/state';
import { drawSelection, dropCursor, EditorView, highlightActiveLine, keymap } from '@codemirror/view';
import { vim } from '@replit/codemirror-vim';
import { toast } from 'sonner';
import { createNote } from '../../data/gateway';
import { useDataStore } from '../../data/store';
import { openFromLink } from '../../features/note/openToSide';
import { findLinkedNote, findWikiLinkedNote, matchWikiLinks } from '../../lib/links';
import { hasPrimaryModifier } from '../../lib/platform';
import { useSettings } from '../../store/settings';
import { registerEditor, reportCaret } from '../bridge';
import { linkedNotePath } from '../links/linkTargets';
import { linkCompletion } from './linkCompletion';
import { taskBoxes } from './taskBoxes';
import { sourceTheme } from './theme';

export interface SourceEditorProps {
  /** The Markdown body. A new value from the host (a reload) replaces the text without an `onChange`. */
  value: string;
  onChange: (markdown: string) => void;
  path: string;
  vimKeys: boolean;
  /** Body line (0-based) to put the caret on and focus when it opens (a switch from rendered). */
  initialLine?: number;
  /** A task checkbox was clicked: the body line and its text. */
  onTaskToggle?: (line: number, text: string) => void;
}

/** Marks a transaction that loads the host's value, so it is never reported as an edit. */
const fromHost = Annotation.define<boolean>();

const notesNow = () => Object.values(useDataStore.getState().notes);

/** The link under `offset` on a line: `[[wiki]]` or `[text](href)`. */
function linkAt(text: string, offset: number): { wiki: string } | { href: string } | null {
  const wiki = matchWikiLinks(text).find((link) => offset >= link.index && offset <= link.index + link.length);
  if (wiki) return { wiki: wiki.target };
  for (const match of text.matchAll(/\[[^\]\n]*\]\(([^)\s]+)\)/g)) {
    const start = match.index ?? 0;
    if (offset >= start && offset <= start + match[0].length) return { href: match[1] };
  }
  return null;
}

/** ⌘-click a link in source mode opens its note (⌘⇧-click opens it beside this one). */
function openLinkAt(view: EditorView, pos: number, path: string, beside: boolean): boolean {
  const line = view.state.doc.lineAt(pos);
  const link = linkAt(line.text, pos - line.from);
  if (!link) return false;
  const notes = notesNow();
  if ('wiki' in link) {
    const linked = findWikiLinkedNote(link.wiki, notes);
    if (linked) openFromLink(linked.path, beside);
    else
      void createNote(linkedNotePath(link.wiki, path)).then(
        (note) => openFromLink(note.path, beside),
        () => toast.error(`Couldn’t create “${link.wiki}”`),
      );
    return true;
  }
  const linked = findLinkedNote(link.href, path, notes);
  if (linked) openFromLink(linked.path, beside);
  return Boolean(linked);
}

/** The smallest change that turns `from` into `to`, so the caret and undo history stay put around it. */
function diff(from: string, to: string) {
  let start = 0;
  while (start < from.length && start < to.length && from[start] === to[start]) start += 1;
  let end = 0;
  while (end < from.length - start && end < to.length - start && from[from.length - 1 - end] === to[to.length - 1 - end]) end += 1;
  return { from: start, to: from.length - end, insert: to.slice(start, to.length - end) };
}

/**
 * The note as Markdown source: CodeMirror with the design tokens, Markdown and
 * fenced-code highlighting, `[[` suggestions, clickable task checkboxes, find,
 * and optional Vim keys. What you type is what is saved.
 */
export default function SourceEditor({ value, onChange, path, vimKeys, initialLine, onTaskToggle }: SourceEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const lastSeen = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onTaskRef = useRef(onTaskToggle);
  onTaskRef.current = onTaskToggle;
  const vimSlot = useMemo(() => new Compartment(), []);

  useEffect(() => {
    const report = EditorView.updateListener.of((update) => {
      if (update.docChanged && !update.transactions.some((tr) => tr.annotation(fromHost))) {
        // sliceDoc joins lines with the file's own line ending; doc.toString() would always use \n.
        const text = update.state.sliceDoc();
        if (text !== lastSeen.current) {
          lastSeen.current = text;
          onChangeRef.current(text);
        }
      }
      if ((update.selectionSet || update.focusChanged) && update.view.hasFocus) {
        reportCaret(path, update.state.doc.lineAt(update.state.selection.main.head).number - 1);
      }
    });
    const state = EditorState.create({
      doc: value,
      extensions: [
        // Vim first, so its keys win over the default keymap.
        vimSlot.of(vimKeys ? vim() : []),
        // Keep the file's own line endings: a CRLF file stays CRLF.
        EditorState.lineSeparator.of(value.includes('\r\n') ? '\r\n' : '\n'),
        history(),
        drawSelection(),
        dropCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        bracketMatching(),
        closeBrackets(),
        EditorView.lineWrapping,
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        sourceTheme,
        search({ top: false }),
        autocompletion({ override: [linkCompletion(notesNow, path, () => useSettings.getState().recentFiles)], icons: false }),
        keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...searchKeymap, ...completionKeymap, indentWithTab]),
        taskBoxes((line, text) => onTaskRef.current?.(line, text)),
        EditorView.domEventHandlers({
          mousedown(event, view) {
            if (!hasPrimaryModifier(event) || event.button !== 0) return false;
            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
            if (pos === null || !openLinkAt(view, pos, path, event.shiftKey)) return false;
            event.preventDefault();
            return true;
          },
        }),
        EditorView.contentAttributes.of({ 'aria-label': 'Markdown source' }),
        report,
      ],
    });
    const view = new EditorView({ state, parent: host.current! });
    viewRef.current = view;

    const reveal = (line: number) => {
      const target = view.state.doc.line(Math.min(Math.max(line + 1, 1), view.state.doc.lines));
      view.dispatch({ selection: { anchor: target.from }, effects: EditorView.scrollIntoView(target.from, { y: 'center' }) });
      view.focus();
    };
    const unregister = registerEditor(path, { revealLine: reveal });
    // Switched here from rendered: keep writing on the same line.
    if (initialLine !== undefined) window.setTimeout(() => view.dom.isConnected && reveal(initialLine), 0);
    return () => {
      unregister();
      view.destroy();
      viewRef.current = null;
    };
  }, [path]);

  // A value from the host: our own echo (ignored), or the file changed on disk.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || value === lastSeen.current) return;
    lastSeen.current = value;
    if (view.state.sliceDoc() === value) return;
    // Positions count each line break as one character, so compare with \n breaks and insert with the file's own.
    const eol = view.state.lineBreak;
    const change = diff(view.state.doc.toString(), value.split(eol).join('\n'));
    view.dispatch({
      changes: { ...change, insert: change.insert.split('\n').join(eol) },
      annotations: [fromHost.of(true), Transaction.addToHistory.of(false)],
    });
  }, [value]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: vimSlot.reconfigure(vimKeys ? vim() : []) });
  }, [vimKeys]);

  return <div ref={host} className="source-editor min-h-64" />;
}
