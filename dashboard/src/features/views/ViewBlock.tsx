import { FileText, ListChecks, Maximize2 } from 'lucide-react';
import type { ViewKind } from '@shared/query';
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
}

/**
 * A live view inside a note: the editor renders ```tasks and ```notes fences
 * with this component. Results update as files change; checking a task
 * writes to that task's own file.
 */
export function ViewBlock({ kind, query, sourcePath }: ViewBlockProps) {
  const result = useView(kind, query);
  return (
    <div data-task-scope="" data-source={sourcePath} contentEditable={false} className="flex flex-col gap-1 rounded-lg bg-sunken p-2">
      <div className="flex h-8 items-center gap-2 pl-3 pr-1">
        <Icon icon={kind === 'tasks' ? ListChecks : FileText} size="sm" className="text-text-tertiary" />
        <span style={{ fontVariantLigatures: 'none' }} className="min-w-0 flex-1 truncate font-mono text-xs text-text-secondary">{query || kind}</span>
        <span className="shrink-0 text-xs tabular-nums text-text-tertiary">
          {countLabel(result.total, kind)}
        </span>
        <IconButton icon={Maximize2} label="Open as view" size="sm" onClick={() => go(viewUrl(kind, query))} />
      </div>
      {result.errors.length ? <p className="px-3 text-xs text-text-secondary">{result.errors.join(' ')}</p> : null}
      <ViewResults result={result} compact empty={kind === 'tasks' ? 'No tasks match right now.' : 'No notes match right now.'} />
    </div>
  );
}
