import { useParams } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { useView } from '../../data/selectors';
import { useSettings } from '../../store/settings';
import { EmptyState, PageHeader, PageLayout } from '../../ui';
import { ViewResults } from './ViewResults';

/** `/view/:id`: a pinned view from Settings. */
export default function ViewScreen() {
  const { id } = useParams();
  const view = useSettings((state) => state.pinnedViews.find((entry) => entry.id === id));
  const result = useView(view?.kind ?? 'tasks', view?.query ?? '');
  if (!view) {
    return (
      <PageLayout>
        <EmptyState icon={SearchX} title="This view is gone" description="It may have been removed in Settings." />
      </PageLayout>
    );
  }
  return (
    <PageLayout className="gap-6">
      <PageHeader title={view.name} subtitle={<span className="font-mono text-sm">{view.query}</span>} />
      <ViewResults result={result} />
    </PageLayout>
  );
}
