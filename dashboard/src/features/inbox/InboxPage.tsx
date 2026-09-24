import { useSearchParams } from 'react-router-dom';
import { Inbox, ListChecks, Plus } from 'lucide-react';
import { useDataStatus, useInbox } from '../../data/selectors';
import { Button, EmptyState, LoadingState, PageHeader, PageLayout, formatShortcut } from '../../ui';
import { useCreate } from '../shell/useCreate';
import { InboxRow } from './InboxRow';
import { SortInbox } from './SortInbox';

/** Captures waiting to be sorted, and the one-at-a-time flow that sorts them. */
export default function InboxPage() {
  const inbox = useInbox();
  const status = useDataStatus();
  const [params, setParams] = useSearchParams();
  const { newTask } = useCreate();
  // `?sort=1` (Sort inbox from the palette, or the button here) is the sorting flow.
  const sorting = params.get('sort') === '1';
  const setSorting = (on: boolean) => setParams(on ? { sort: '1' } : {}, { replace: !on });

  if (sorting) {
    return (
      <div className="scrollbar-stable h-full overflow-y-auto bg-canvas">
        {status === 'ready' ? <SortInbox onExit={() => setSorting(false)} /> : <LoadingState className="p-12" />}
      </div>
    );
  }

  const count = inbox.length;
  return (
    <PageLayout className="gap-6">
      <PageHeader
        title="Inbox"
        subtitle={count > 0 ? `${count} ${count === 1 ? 'capture' : 'captures'} waiting to be sorted` : undefined}
        actions={
          count > 0 ? (
            <Button variant="primary" leadingIcon={ListChecks} onClick={() => setSorting(true)}>
              Sort inbox
            </Button>
          ) : null
        }
        className="px-2"
      />
      {status !== 'ready' ? (
        <LoadingState rows={4} />
      ) : count === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Your inbox is clear."
          description={`Press ${formatShortcut('mod+n')} to capture a thought.`}
          action={
            <Button leadingIcon={Plus} onClick={newTask}>
              Capture
            </Button>
          }
          className="py-16"
        />
      ) : (
        <div role="list" aria-label="Captures" className="flex flex-col gap-0.5">
          {inbox.map((item) => (
            <InboxRow key={item.filePath} item={item} />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
