import { useEffect } from 'react';
import { toast } from 'sonner';
import { hasPrimaryModifier } from '../utils/platform';

export interface UndoEntry {
  label: string;
  undo: () => Promise<unknown>;
  redo: () => Promise<unknown>;
}

const LIMIT = 50;
const past: UndoEntry[] = [];
const future: UndoEntry[] = [];

export function record(entry: UndoEntry): void {
  past.push(entry);
  if (past.length > LIMIT) past.shift();
  future.length = 0;
}

/** Paths from another workspace mean nothing here. */
export function clearHistory(): void {
  past.length = 0;
  future.length = 0;
}

async function step(from: UndoEntry[], to: UndoEntry[], run: (entry: UndoEntry) => Promise<unknown>) {
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
