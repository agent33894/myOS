import { useEffect, useRef } from 'react';
import type { ArtifactSummary } from '@shared/types';
import { rename } from '../../data/gateway';
import { useDataStore } from '../../data/store';
import { useSettingsStore } from '../../store/settings';
import { followUndo } from './toasts';

/** How long a title must sit still before its file follows it. */
const IDLE_MS = 2000;
/** Title fields whose edits count; other changes (a reload from disk) never rename. */
const TITLE_FIELDS = 'textarea[aria-label="Title"], textarea[aria-label="Project name"]';
const PLACEHOLDER_TITLES = new Set(['', 'untitled', 'untitled project']);

let lastTitleInput = 0;
/** The page whose title had the caret when its file was renamed, so the new page can put it back. */
let refocusPath: string | null = null;

if (typeof document !== 'undefined') {
  document.addEventListener(
    'input',
    (event) => {
      if (event.target instanceof Element && event.target.matches(TITLE_FIELDS)) lastTitleInput = Date.now();
    },
    true,
  );
}

const titleField = () => document.querySelector<HTMLTextAreaElement>(TITLE_FIELDS);

/** Somewhere a rename (which reopens the page) would not interrupt: not mid-sentence in the body, a menu, or a dialog. */
function quietFocus(): boolean {
  const active = document.activeElement;
  if (!active || active === document.body) return true;
  if (active.matches(TITLE_FIELDS)) return Date.now() - lastTitleInput >= IDLE_MS;
  if (active.closest('[contenteditable="true"], [role="dialog"], [role="menu"], [role="listbox"]')) return false;
  return !['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName);
}

/**
 * File names follow titles: once the user stops editing a page's title (about
 * two seconds after the last keystroke, when they are not typing elsewhere, or
 * when they leave the page) and the save has landed, the file is renamed to
 * `<slug>.md` in its folder and `onMoved` receives the new path. Undoable, off
 * with Settings → "Keep file names in sync with titles", and never for an
 * untitled page. Journal pages keep their dated names (the main process skips them).
 */
export function useRenameWithTitle(
  item: ArtifactSummary | undefined,
  title: string,
  onMoved: (path: string) => void,
  /** Save pending edits first, so the file carries the new title. */
  flush: () => Promise<void> = () => Promise.resolve(),
): void {
  const path = item?.filePath ?? null;
  const latest = useRef({ title, onMoved, flush });
  latest.current = { title, onMoved, flush };
  const pending = useRef(false);
  const previous = useRef(title);

  // A title edit (not a reload from disk) marks the file for renaming.
  useEffect(() => {
    if (title === previous.current) return;
    previous.current = title;
    if (Date.now() - lastTitleInput < 5000) pending.current = true;
  }, [title]);

  useEffect(() => {
    if (!path) return;
    const run = async (follow: boolean) => {
      pending.current = false;
      if (!useSettingsStore.getState().renameFilesWithTitles) return;
      const typed = latest.current.title.trim();
      if (PLACEHOLDER_TITLES.has(typed.toLowerCase())) return;
      const { flush, onMoved } = latest.current;
      await flush();
      const saved = useDataStore.getState().byPath[path];
      if (!saved || saved.title.trim() !== typed) return;
      const hadCaret = document.activeElement?.matches(TITLE_FIELDS) ?? false;
      try {
        const moved = await rename(saved);
        if (moved.filePath === path) return;
        const name = moved.filePath.split('/').pop();
        followUndo(`File renamed to ${name}`, follow ? () => onMoved(path) : undefined);
        if (!follow) return;
        if (hadCaret) refocusPath = moved.filePath;
        onMoved(moved.filePath);
      } catch {
        // The file changed underneath (a conflict) or went away: keep its name.
      }
    };

    // Put the caret back in the title after the page reopened at its new path.
    let refocus: number | undefined;
    if (refocusPath === path) {
      refocusPath = null;
      refocus = window.setTimeout(() => {
        const field = titleField();
        if (!field || field.disabled) return;
        field.focus();
        field.setSelectionRange(field.value.length, field.value.length);
      }, 60);
    }

    const timer = window.setInterval(() => {
      if (pending.current && Date.now() - lastTitleInput >= IDLE_MS && quietFocus()) void run(true);
    }, 500);
    return () => {
      window.clearTimeout(refocus);
      window.clearInterval(timer);
      // Leaving the page: rename quietly after its final save.
      if (pending.current) void run(false);
    };
  }, [path]);
}
