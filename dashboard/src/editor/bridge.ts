import { create } from 'zustand';

/**
 * How the note's panels and mode switch reach the editor on screen, whichever
 * mode it is in. Lines are 0-based lines of the Markdown body (the text after
 * any frontmatter), the same numbering in both modes.
 */
export interface EditorHandle {
  /** Put the caret at the start of a body line and bring it into view. */
  revealLine(line: number): void;
}

const handles = new Map<string, EditorHandle>();

/** Called by an editor while it shows `path`; returns the cleanup. */
export function registerEditor(path: string, handle: EditorHandle): () => void {
  handles.set(path, handle);
  return () => {
    if (handles.get(path) === handle) handles.delete(path);
  };
}

/** The editor showing `path`, if one is mounted. */
export const editorFor = (path: string) => handles.get(path);

/** The caret's body line per open note, so the Outline can mark where you are and a mode switch can keep the line. */
export const useCaretLines = create<Record<string, number>>(() => ({}));

export function reportCaret(path: string, line: number): void {
  if (useCaretLines.getState()[path] !== line) useCaretLines.setState({ [path]: line });
}
