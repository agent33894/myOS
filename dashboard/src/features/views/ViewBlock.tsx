import type { ViewKind } from '@shared/query';
import { useView } from '../../data/selectors';
import { ViewResults } from './ViewResults';

export interface ViewBlockProps {
  kind: ViewKind;
  /** The view text from the fence (see shared/query.ts `viewFromFence`). */
  query: string;
  /** The note the block sits in. */
  sourcePath: string;
}

/**
 * A live view inside a note: the editor renders ```tasks and ```notes fences
 * with this component. Results update as files change; checking a task
 * writes to that task's own file.
 */
export function ViewBlock({ kind, query }: ViewBlockProps) {
  const result = useView(kind, query);
  return (
    <div className="rounded-lg bg-sunken p-2">
      <ViewResults result={result} empty={query ? `Nothing matches “${query}”.` : 'Nothing here yet.'} />
    </div>
  );
}
