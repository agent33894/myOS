import { useSearchParams } from 'react-router-dom';
import { useView } from '../../data/selectors';
import { Input, PageHeader, PageLayout } from '../../ui';
import { ViewResults } from '../views/ViewResults';

/** `/tasks?q=…`: every task in the folder, narrowed and grouped with the view syntax (default: open). */
export default function TasksScreen() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? 'open';
  const result = useView('tasks', query);
  return (
    <PageLayout className="gap-6">
      <PageHeader title="Tasks" subtitle={`${result.total} ${result.total === 1 ? 'task' : 'tasks'}`} />
      <Input
        aria-label="Filter tasks"
        placeholder="open due<=today #work group:file"
        value={query}
        onChange={(event) => setParams({ q: event.target.value }, { replace: true })}
        className="font-mono"
      />
      <ViewResults result={result} />
    </PageLayout>
  );
}
