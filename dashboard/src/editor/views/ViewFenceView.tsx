import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import { FileText, ListChecks, Pencil } from 'lucide-react';
import { viewFromFence } from '@shared/query';
import { ViewBlock } from '../../features/views/ViewBlock';
import { cn, Icon, IconButton, Input } from '../../ui';

/**
 * A live view inside a note. The header names the view and shows its query
 * in mono; "Edit query" swaps it for a field. Saving rewrites only this fence,
 * keeping the query where it was written (after the name, or on its own lines).
 */
export function ViewFenceView({ node, editor, getPos, selected, updateAttributes }: ReactNodeViewProps) {
  const info = node.attrs.info as string;
  const source = node.attrs.source as string;
  const view = viewFromFence(info, source) ?? { kind: 'tasks' as const, query: '' };
  const [editing, setEditing] = useState(Boolean(node.attrs.fresh));
  const [draft, setDraft] = useState(view.query);
  const field = useRef<HTMLInputElement>(null);
  const sourcePath = editor.storage.viewFence.sourcePath;

  useEffect(() => {
    if (!editing) return;
    // After the insert’s own focus has settled in the editor; typing replaces the starting query.
    const timer = window.setTimeout(() => field.current?.select(), 0);
    return () => window.clearTimeout(timer);
  }, [editing]);

  const save = () => {
    setEditing(false);
    const query = draft.replace(/\s+/g, ' ').trim();
    if (query === view.query) return;
    const name = /^\s*(\S+)/.exec(info)?.[1] ?? 'view';
    const text = [view.kind === 'notes' ? 'kind:notes' : '', query].filter(Boolean).join(' ');
    // The query stays where it was written: after the name, or inside the fence.
    updateAttributes(source.trim() ? { info: name, source: text } : { info: text ? `${name} ${text}` : name, source: '' });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      save();
      leave();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setDraft(view.query);
      setEditing(false);
      leave();
    }
  };

  const leave = () => {
    const pos = getPos();
    // Back to the editor with the view selected, so arrows and typing carry on from here.
    if (typeof pos === 'number') editor.chain().focus().setNodeSelection(pos).run();
  };

  return (
    <NodeViewWrapper className={cn('view-fence not-prose group/view my-6 rounded-lg outline-none', selected && 'ring-2 ring-focus ring-offset-4')} contentEditable={false} data-drag-handle="">
      <ViewBlock
        kind={view.kind}
        query={view.query}
        sourcePath={sourcePath}
        title={
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-text-secondary">
            <Icon icon={view.kind === 'tasks' ? ListChecks : FileText} size="sm" />
            <span className="font-medium">{view.kind === 'tasks' ? 'Tasks' : 'Notes'}</span>
            {editing ? (
              <Input
                ref={field}
                size="sm"
                aria-label="View query"
                placeholder={view.kind === 'tasks' ? 'open due<=today #work' : '#meeting sort:modified'}
                value={draft}
                spellCheck={false}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onKeyDown}
                onBlur={save}
                className="flex-1 font-mono"
              />
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-text-tertiary">{view.query || 'everything'}</span>
                {editor.isEditable ? (
                  <IconButton
                    icon={Pencil}
                    label="Edit query"
                    size="sm"
                    className="opacity-0 transition-opacity duration-fast focus-visible:opacity-100 group-hover/view:opacity-100"
                    onClick={() => {
                      setDraft(view.query);
                      setEditing(true);
                    }}
                  />
                ) : null}
              </>
            )}
          </div>
        }
      />
    </NodeViewWrapper>
  );
}
