import { FileText, ListChecks, Maximize2 } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { resolveFromNote, type ViewKind } from '@shared/query';
import { go } from '../../app/navigation';
import { useView } from '../../data/selectors';
import { Icon, IconButton } from '../../ui';
import { countLabel, viewUrl } from './queryText';
import { ViewResults } from './ViewResults';

export interface ViewBlockProps {
  kind: ViewKind;
  /** The view text from the fence (see shared/query.ts `viewFromFence`). */
  query: string;
  /** The note the block sits in. */
  sourcePath: string;
  /** Replaces the kind icon and query at the start of the header (the editor puts its query field there). */
  title?: ReactNode;
}

/**
 * A live view inside a note: the editor renders ```view fences
 * with this component. Results update as files change; checking a task
 * writes to that task's own file. Place terms are read from the note's own
 * folder (see `resolveFromNote`).
 */
export function ViewBlock({ kind, query, sourcePath, title }: ViewBlockProps) {
  // `path:.`, `path:../x`, and `file:this` mean this note's folder and file.
  const resolved = useMemo(() => (sourcePath ? resolveFromNote(query, sourcePath) : query), [query, sourcePath]);
  const result = useView(kind, resolved);
  return (
    <div data-task-scope="" data-source={sourcePath} contentEditable={false} className="flex flex-col gap-1 rounded-lg bg-sunken p-2">
      <div className="flex h-8 items-center gap-2 pl-3 pr-1">
        {title ?? (
          <>
            <Icon icon={kind === 'tasks' ? ListChecks : FileText} size="sm" className="text-text-tertiary" />
            <span style={{ fontVariantLigatures: 'none' }} className="min-w-0 flex-1 truncate font-mono text-xs text-text-secondary">{query || kind}</span>
          </>
        )}
        <span className="shrink-0 text-xs tabular-nums text-text-tertiary">
          {countLabel(result.total, kind)}
        </span>
        <IconButton icon={Maximize2} label="Open as view" size="sm" onClick={() => go(viewUrl(kind, resolved))} />
      </div>
      {result.errors.length ? <p className="px-3 text-xs text-text-secondary">{result.errors.join(' ')}</p> : null}
      <ViewResults result={result} compact empty={kind === 'tasks' ? 'No tasks match right now.' : 'No notes match right now.'} />
    </div>
  );
}
