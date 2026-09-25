import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { NoteSummary } from '@shared/spec';
import { rankLinkTargets } from '../links/linkTargets';

/**
 * `[[` in source mode suggests notes by title and path, like the rendered
 * editor does, and writes `[[Title]]`.
 */
export function linkCompletion(getNotes: () => readonly NoteSummary[], path: string, recent: () => readonly string[]) {
  return (context: CompletionContext): CompletionResult | null => {
    const before = context.matchBefore(/\[\[[^[\]|\n]*/);
    if (!before) return null;
    const query = before.text.slice(2);
    const after = context.state.sliceDoc(context.pos, context.pos + 2);
    const notes = rankLinkTargets(getNotes(), query, { recentPaths: recent(), exclude: path, limit: 20 });
    return {
      from: before.from + 2,
      filter: false,
      options: notes.map((note) => ({
        label: note.title,
        detail: note.path,
        apply: (view, _completion, from, to) => {
          const text = `${note.title}]]`;
          const end = after === ']]' ? to + 2 : to;
          view.dispatch({ changes: { from, to: end, insert: text }, selection: { anchor: from + text.length } });
        },
      })),
    };
  };
}
