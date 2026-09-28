import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Archive, CheckCircle2, FolderInput, MailOpen, RotateCcw, Send, Undo2, Wand2 } from 'lucide-react';
import { formatLocalDate } from '@shared/date';
import { CATEGORIES } from '@shared/mail/config';
import type { MailActivity, MailCategory, MailItem, MailSnapshot } from '@shared/mail/types';
import { setMailConfig } from '../../data/mail';
import { Button, EmptyState, Icon, IconButton, Pill, SectionHeader } from '../../ui';
import { dayLabel, relativeTime } from '../tasks/dates';
import { fileNow, undoActivity } from './actions';
import { MailRow } from './MailRow';

const KIND_ICON: Record<MailActivity['kind'], LucideIcon> = {
  filed: FolderInput,
  archived: Archive,
  read: MailOpen,
  task: CheckCircle2,
  sent: Send,
  restored: RotateCcw,
  unsubscribe: Archive,
};

const canUndo = (entry: MailActivity) => !entry.undone && (Boolean(entry.move) || entry.kind === 'read' || entry.kind === 'task');

function kindCounts(items: MailItem[]): string {
  const counts = new Map<MailCategory, number>();
  for (const item of items) counts.set(item.verdict.category, (counts.get(item.verdict.category) ?? 0) + 1);
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => `${count} ${CATEGORIES[category].label.toLowerCase()}${count === 1 ? '' : 's'}`)
    .join(' · ');
}

/** Watch mode's preview: what "Sort for me" would file, with one button to do it. */
function ReadyToFile({ items, watching }: { items: MailItem[]; watching: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? items : items.slice(0, 8);
  return (
    <section aria-label="Ready to file" className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-lg bg-accent-soft p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-accent-text">
            <Icon icon={Wand2} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-base font-medium text-text">
              {items.length} {items.length === 1 ? 'email needs' : 'emails need'} no attention
            </p>
            <p className="text-sm text-text-secondary">{kindCounts(items)}</p>
            {watching ? (
              <p className="text-sm text-text-secondary">myOS is only watching for now. File these, and let it keep filing mail like this as it arrives.</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pl-8">
          <Button variant="primary" leadingIcon={FolderInput} onClick={() => fileNow(items)}>
            File {items.length === 1 ? 'it' : `all ${items.length}`}
          </Button>
          {watching ? (
            <Button
              onClick={() => {
                void setMailConfig({ automation: 'sort' });
                fileNow(items);
              }}
            >
              File them and sort for me from now on
            </Button>
          ) : null}
        </div>
      </div>
      <div role="list" aria-label="Emails to file" className="flex flex-col gap-0.5">
        {shown.map((item) => (
          <MailRow key={item.id} item={item} />
        ))}
      </div>
      {items.length > shown.length ? (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setShowAll(true)}>
          Show all {items.length}
        </Button>
      ) : null}
    </section>
  );
}

function ActivityRow({ entry }: { entry: MailActivity }) {
  return (
    <div role="listitem" className="group/row flex min-h-9 items-center gap-3 rounded-md px-2 text-base hover:bg-text/5">
      <span className="text-text-tertiary">
        <Icon icon={KIND_ICON[entry.kind]} size="sm" />
      </span>
      <span className={entry.undone ? 'min-w-0 flex-1 truncate text-text-tertiary line-through' : 'min-w-0 flex-1 truncate text-text'}>
        {entry.summary}
      </span>
      {entry.auto ? <Pill>Automatic</Pill> : null}
      <span className="shrink-0 text-xs text-text-tertiary">{relativeTime(entry.at)}</span>
      {canUndo(entry) ? (
        <IconButton icon={Undo2} label="Undo" size="sm" onClick={() => undoActivity(entry.id)} className="opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100" />
      ) : (
        <span className="size-7 shrink-0" />
      )}
    </div>
  );
}

/** What myOS did, newest first, grouped by day; every move can be put back. */
export function Handled({ snapshot, toFile }: { snapshot: MailSnapshot; toFile: MailItem[] }) {
  const days = useMemo(() => {
    const groups = new Map<string, MailActivity[]>();
    for (const entry of snapshot.activity) {
      const key = formatLocalDate(new Date(entry.at));
      groups.set(key, [...(groups.get(key) ?? []), entry]);
    }
    return [...groups];
  }, [snapshot.activity]);

  if (toFile.length === 0 && days.length === 0) {
    return <EmptyState icon={Archive} title="Nothing handled yet." description="When myOS files or archives mail for you, it shows up here with a way to undo it." className="py-16" />;
  }

  return (
    <div className="flex flex-col gap-6">
      {toFile.length ? <ReadyToFile items={toFile} watching={snapshot.config.automation === 'watch'} /> : null}
      {days.map(([day, entries]) => (
        <section key={day} aria-label={dayLabel(day)}>
          <SectionHeader title={dayLabel(day)} count={entries.length} className="px-2" />
          <div role="list" className="flex flex-col gap-0.5">
            {entries.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
