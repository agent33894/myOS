import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { PinnedView } from '@shared/settings';
import { updateSettings, useSettings } from '../../store/settings';
import { Button, IconButton, Input, Select, SelectItem } from '../../ui';
import { SettingsGroup } from './SettingsGroup';

const save = (pinnedViews: PinnedView[]) => void updateSettings({ pinnedViews });

/** A field that saves when it loses focus or on Enter. */
function Draft({ value, label, onSave, className }: { value: string; label: string; onSave: (value: string) => void; className?: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = () => text.trim() && text.trim() !== value && onSave(text.trim());
  return (
    <Input
      size="sm"
      aria-label={label}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => event.key === 'Enter' && commit()}
      className={className}
    />
  );
}

function newId(views: PinnedView[]): string {
  for (let count = 1; ; count += 1) {
    const id = count === 1 ? 'view' : `view-${count}`;
    if (!views.some((view) => view.id === id)) return id;
  }
}

/** Pinned views: the saved searches in the sidebar. Name, search, kind, order. */
export function ViewsSettings() {
  const views = useSettings((state) => state.pinnedViews);
  const change = (id: string, patch: Partial<PinnedView>) => save(views.map((view) => (view.id === id ? { ...view, ...patch } : view)));
  const move = (index: number, step: number) => {
    const next = [...views];
    const [view] = next.splice(index, 1);
    next.splice(index + step, 0, view);
    save(next);
  };

  return (
    <SettingsGroup
      title="Views"
      description={
        <>
          Saved searches pinned to the sidebar, such as <span className="font-mono">open due&lt;=today #work</span>. The same line works in a note inside a <span className="font-mono">```view</span> block.
        </>
      }
    >
      {views.map((view, index) => (
        <div key={view.id} className="flex items-center gap-2 px-4 py-3">
          <Draft value={view.name} label={`Name of ${view.name}`} onSave={(name) => change(view.id, { name })} className="w-36 shrink-0" />
          <Draft value={view.query} label={`Search for ${view.name}`} onSave={(query) => change(view.id, { query })} className="min-w-0 flex-1 font-mono" />
          <Select size="sm" aria-label={`What ${view.name} lists`} value={view.kind} onValueChange={(kind) => change(view.id, { kind: kind as PinnedView['kind'] })} className="w-24 shrink-0">
            <SelectItem value="tasks">Tasks</SelectItem>
            <SelectItem value="notes">Notes</SelectItem>
          </Select>
          <IconButton icon={ArrowUp} label="Move up" size="sm" disabled={index === 0} onClick={() => move(index, -1)} />
          <IconButton icon={ArrowDown} label="Move down" size="sm" disabled={index === views.length - 1} onClick={() => move(index, 1)} />
          <IconButton icon={Trash2} label={`Unpin ${view.name}`} size="sm" onClick={() => save(views.filter((entry) => entry.id !== view.id))} />
        </div>
      ))}
      <div className="flex items-center gap-3 px-4 py-3">
        <Button size="sm" variant="ghost" leadingIcon={Plus} onClick={() => save([...views, { id: newId(views), name: 'New view', query: 'open', kind: 'tasks' }])}>
          Add a view
        </Button>
        {views.length === 0 ? <span className="text-sm text-text-secondary">No views are pinned.</span> : null}
      </div>
    </SettingsGroup>
  );
}
