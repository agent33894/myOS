import { useEffect } from 'react';
import { toast } from 'sonner';
import { hasPrimaryModifier } from '../lib/platform';

export interface UndoEntry {
  label: string;
  /** The files and folders the change touched, so a later change to the same ones can be told apart. */
  paths: string[];
  undo: () => Promise<unknown>;
  redo: () => Promise<unknown>;
}

interface Stored extends UndoEntry {
  id: number;
}

const LIMIT = 50;
const past: Stored[] = [];
const future: Stored[] = [];
let nextId = 1;

/** Keep a change for ⌘Z; resolves to its id, which `undoChange` takes. */
export function record(entry: UndoEntry): number {
  const id = nextId++;
  past.push({ ...entry, id });
  if (past.length > LIMIT) past.shift();
  future.length = 0;
  return id;
}

/** The id of the change recorded last, for a toast that offers to undo it. */
export const latestChange = () => past.at(-1)?.id ?? null;

const overlaps = (a: string[], b: string[]) => a.some((x) => b.some((y) => x === y || x.startsWith(`${y}/`) || y.startsWith(`${x}/`)));

/**
 * Undo one particular change. A change can be undone out of order only when
 * no newer change touched the same files; otherwise this fails with a plain
 * message rather than undoing something else.
 */
export async function undoChange(id: number): Promise<string> {
  const index = past.findIndex((entry) => entry.id === id);
  if (index < 0) throw new Error(future.some((entry) => entry.id === id) ? 'That change is already undone.' : 'That change can no longer be undone.');
  const entry = past[index];
  const newer = past.slice(index + 1).find((later) => overlaps(later.paths, entry.paths));
  if (newer) throw new Error(`A newer change to the same file came after it (${newer.label}). Undo that first.`);
  await entry.undo();
  past.splice(past.indexOf(entry), 1);
  future.push(entry);
  return entry.label;
}

/**
 * A confirmation with an Undo button for the change recorded just before it.
 * `after` runs once it is undone (a page follows its file back).
 */
export function offerUndo(message: string, after?: () => void): void {
  const id = latestChange();
  if (id === null) {
    toast.success(message);
    return;
  }
  toast.success(message, {
    action: {
      label: 'Undo',
      onClick: () => {
        undoChange(id)
          .then(() => after?.())
          .catch((error: unknown) => toast.error(error instanceof Error ? error.message : 'Could not undo that'));
      },
    },
  });
}

/** Paths from another workspace mean nothing here. */
export function clearHistory(): void {
  past.length = 0;
  future.length = 0;
}

async function step(from: Stored[], to: Stored[], run: (entry: Stored) => Promise<unknown>) {
  const entry = from.pop();
  if (!entry) return null;
  // A step that fails (the file changed or reappeared elsewhere) is dropped, not retried.
  await run(entry);
  to.push(entry);
  return entry.label;
}

/** Undo the latest recorded change; resolves to its label, or null when there is nothing to undo. */
export const undo = () => step(past, future, (entry) => entry.undo());
/** @public */
export const redo = () => step(future, past, (entry) => entry.redo());

async function announce(action: Promise<string | null>, verb: string) {
  try {
    const label = await action;
    if (label) toast.success(`${verb}: ${label}`);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : `Could not ${verb.toLowerCase()}`);
  }
}

/** ⌘Z / ⇧⌘Z outside text fields, which keep their own undo history. */
export function useUndoShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!hasPrimaryModifier(event) || event.key.toLowerCase() !== 'z') return;
      const target = event.target as HTMLElement;
      if (target.isContentEditable || target.closest('[contenteditable="true"]')) return;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return;
      event.preventDefault();
      void (event.shiftKey ? announce(redo(), 'Redone') : announce(undo(), 'Undone'));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
