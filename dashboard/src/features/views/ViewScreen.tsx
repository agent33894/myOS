import { useDeferredValue, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Copy, SearchX, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PinnedView } from '@shared/settings';
import { fenceFor } from '@shared/query';
import { go, paths } from '../../app/navigation';
import { useView } from '../../data/selectors';
import { useSettings } from '../../store/settings';
import { Button, EmptyState, IconButton, Input, PageHeader, PageLayout } from '../../ui';
import { removeView, updateView } from './pinned';
import { QueryBar } from './QueryBar';
import { countLabel } from './queryText';
import { ViewResults } from './ViewResults';

const SAVE_DELAY_MS = 600;


function SavedView({ view }: { view: PinnedView }) {
  const [name, setName] = useState(view.name);
  const [query, setQuery] = useState(view.query);
  const shown = useDeferredValue(query);
  const result = useView(view.kind, shown);

  // Keep the view's text saved as it changes; the name saves when you leave the field.
  useEffect(() => {
    if (query === view.query) return;
    const timer = window.setTimeout(() => void updateView(view.id, { query }), SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [query, view.id, view.query]);

  const saveName = () => {
    const next = name.trim();
    if (!next) setName(view.name);
    else if (next !== view.name) void updateView(view.id, { name: next });
  };
  const saveQuery = () => {
    if (query !== view.query) void updateView(view.id, { query });
  };

  return (
    <PageLayout className="gap-6">
      <PageHeader
        className="px-2"
        title={
          <Input
            variant="ghost"
            aria-label="View name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={saveName}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') {
                setName(view.name);
                event.currentTarget.blur();
              }
            }}
            className="-ml-1 h-8 text-xl font-semibold"
          />
        }
        subtitle="A saved view, pinned to the sidebar."
        actions={
          <>
            <IconButton
              icon={Copy}
              label="Copy as a block for a note"
              onClick={() =>
                void navigator.clipboard.writeText(fenceFor(view.kind, query)).then(() => toast.success('Copied. Paste it into any note.'))
              }
            />
            <Button variant="ghost" leadingIcon={Trash2} onClick={() => void removeView(view.id)}>
              Remove
            </Button>
          </>
        }
      />
      <div data-task-scope="" className="flex flex-col gap-6">
        <QueryBar kind={view.kind} value={query} onChange={setQuery} onCommit={saveQuery} errors={result.errors} summary={countLabel(result.total, view.kind)} />
        <ViewResults result={result} />
      </div>
    </PageLayout>
  );
}

/** `/view/:id`: a saved view. Its name and text are edited in place; results update live. */
export default function ViewScreen() {
  const { id } = useParams();
  const view = useSettings((state) => state.pinnedViews.find((entry) => entry.id === id));
  if (!view) {
    return (
      <PageLayout>
        <EmptyState
          icon={SearchX}
          title="This view is gone"
          description="It may have been removed. Make a new one from Tasks."
          action={<Button onClick={() => go(paths.tasks)}>Open Tasks</Button>}
        />
      </PageLayout>
    );
  }
  return <SavedView key={view.id} view={view} />;
}
