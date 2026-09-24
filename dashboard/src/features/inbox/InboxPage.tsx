import { useSearchParams } from 'react-router-dom';
import { Inbox, ListChecks } from 'lucide-react';
import { useDataStatus, useInbox } from '../../data/selectors';
import { Button, EmptyState, LoadingState, PageHeader, formatShortcut } from '../../ui';
import { InboxRow } from './InboxRow';
import { SortInbox } from './SortInbox';

/** Captures waiting to be sorted, and the one-at-a-time flow that sorts them. */
export default function InboxPage() {
  const inbox = useInbox();
  const status = useDataStatus();
  const [params, setParams] = useSearchParams();
  // `?sort=1` (Sort inbox from the palette, or the button here) is the sorting flow.
  const sorting = params.get('sort') === '1';
  const setSorting = (on: boolean) => setParams(on ? { sort: '1' } : {}, { replace: !on });

  if (sorting) {
    return (
      <div className="h-full overflow-y-auto bg-canvas">
        {status === 'ready' ? <SortInbox onExit={() => setSorting(false)} /> : <LoadingState className="p-12" />}
      </div>
    );
  }

  const count = inbox.length;
  return (
    <div className="h-full overflow-y-auto bg-canvas">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 pb-24 pt-12">
        <PageHeader
          title="Inbox"
          subtitle={count === 0 ? 'Nothing waiting' : `${count} ${count === 1 ? 'capture' : 'captures'} waiting to be sorted`}
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
            className="py-16"
          />
        ) : (
          <div role="list" aria-label="Captures" className="flex flex-col gap-0.5">
            {inbox.map((item) => (
              <InboxRow key={item.filePath} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
