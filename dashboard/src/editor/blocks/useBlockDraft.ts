import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BlockModel } from './model';

const WRITE_DELAY_MS = 400;

interface Draft<T> {
  /** What the form shows; may not validate yet. */
  value: T | null;
  /** The latest value that validates: what the preview shows. */
  valid: T | null;
  error: string | null;
  /** Bumps when the source changes from outside, so forms can reset local text. */
  revision: number;
}

const fromSource = <T>(model: BlockModel<T>, source: string, revision: number): Draft<T> => {
  const parsed = model.parse(source);
  return parsed.ok
    ? { value: parsed.value, valid: parsed.value, error: null, revision }
    : { value: null, valid: null, error: parsed.error, revision };
};

/**
 * A block's editable value. Edits update a local draft immediately and are
 * written back to the document shortly after, like the page autosaves. A
 * draft that doesn't validate stays local and says why. Source changes that
 * didn't come from this draft (undo, reload) replace it.
 */
export function useBlockDraft<T>(model: BlockModel<T>, source: string, write: (source: string) => void) {
  const [draft, setDraft] = useState<Draft<T>>(() => fromSource(model, source, 0));
  const written = useRef(source);
  const pending = useRef<string | null>(null);
  const timer = useRef<number>();
  const writeRef = useRef(write);
  writeRef.current = write;

  if (source !== written.current && pending.current === null) {
    // Adjusting state during render (not in an effect) keeps the form from
    // showing a stale draft for a frame.
    written.current = source;
    setDraft(fromSource(model, source, draft.revision + 1));
  }

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    const next = pending.current;
    if (next === null) return;
    pending.current = null;
    written.current = next;
    writeRef.current(next);
  }, []);

  // Pending edits are flushed on blur and mode changes, while the node still
  // exists; after unmount the editor may hold a different document.
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const update = useCallback(
    (next: T) => {
      const raw = model.serialize(next);
      const check = model.parse(raw);
      window.clearTimeout(timer.current);
      pending.current = check.ok ? raw : null;
      setDraft((current) =>
        check.ok
          ? { ...current, value: next, valid: next, error: null }
          : { ...current, value: next, error: check.error },
      );
      if (check.ok) timer.current = window.setTimeout(flush, WRITE_DELAY_MS);
    },
    [flush, model],
  );

  return useMemo(() => ({ ...draft, update, flush }), [draft, update, flush]);
}
