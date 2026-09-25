import { useDeferredValue, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookmarkPlus } from 'lucide-react';
import type { ViewKind } from '@shared/query';
import { useView } from '../../data/selectors';
import { Button, PageHeader, PageLayout } from '../../ui';
import { QueryBar } from '../views/QueryBar';
import { countLabel } from '../views/queryText';
import { SaveViewDialog } from '../views/SaveViewDialog';
import { ViewResults } from '../views/ViewResults';

const DEFAULT_QUERY = 'open';

/**
 * `/tasks?q=…`: every task in the folder, narrowed and grouped with the view
 * syntax (default `open`). `&kind=notes` searches notes instead.
 */
export default function TasksScreen() {
  const [params, setParams] = useSearchParams();
  const kind: ViewKind = params.get('kind') === 'notes' ? 'notes' : 'tasks';
  const fromUrl = params.get('q') ?? (kind === 'tasks' ? DEFAULT_QUERY : '');
  const [text, setText] = useState(fromUrl);
  const [saving, setSaving] = useState(false);
  const query = useDeferredValue(text);
  const result = useView(kind, query);

  // Another link or command changed the URL: show its view.
  useEffect(() => setText(fromUrl), [fromUrl]);

  const change = (next: string) => {
    setText(next);
    setParams(kind === 'tasks' ? { q: next } : { q: next, kind }, { replace: true });
  };

  return (
    <PageLayout className="gap-6">
      <PageHeader
        className="px-2"
        title={kind === 'tasks' ? 'Tasks' : 'Notes'}
        subtitle={kind === 'tasks' ? 'Every task in the folder. Narrow it with one line of text.' : 'Notes in the folder that match one line of text.'}
        actions={
          <Button variant="secondary" leadingIcon={BookmarkPlus} onClick={() => setSaving(true)}>
            Save as view
          </Button>
        }
      />
      <div data-task-scope="" className="flex flex-col gap-6">
        <QueryBar kind={kind} value={text} onChange={change} errors={result.errors} summary={countLabel(result.total, kind)} autoFocus />
        <ViewResults result={result} />
      </div>
      <SaveViewDialog open={saving} onOpenChange={setSaving} kind={kind} query={text} />
    </PageLayout>
  );
}
