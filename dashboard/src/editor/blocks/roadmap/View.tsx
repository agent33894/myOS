import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { cn } from '../../../ui';
import type { Roadmap, RoadmapItem, RoadmapStatus } from './model';
import { buildTimeline, groupByLane, type Timeline } from './timeline';

export const STATUS: Record<RoadmapStatus, { label: string; dot: string; bar: string }> = {
  planned: { label: 'Planned', dot: 'bg-text-tertiary', bar: 'fill-text/20' },
  'in-progress': { label: 'In progress', dot: 'bg-accent', bar: 'fill-accent' },
  blocked: { label: 'Blocked', dot: 'bg-danger', bar: 'fill-danger' },
  done: { label: 'Done', dot: 'bg-success', bar: 'fill-success' },
  cancelled: { label: 'Cancelled', dot: 'bg-border-strong', bar: 'fill-text/10' },
};

const shortDate = (date: string) => format(parseISO(date), 'MMM d');

function dates(item: RoadmapItem): string | null {
  if (item.start && item.target) return `${shortDate(item.start)} – ${shortDate(item.target)}`;
  if (item.target) return `Due ${shortDate(item.target)}`;
  return item.start ? `From ${shortDate(item.start)}` : null;
}

function Track({ timeline, item }: { timeline: Timeline; item?: RoadmapItem }) {
  const span = item ? timeline.spanOf(item) : null;
  return (
    <svg className="h-6 w-full overflow-visible" aria-hidden="true">
      {timeline.months.map((month) => (
        <line key={month.label} x1={`${month.left}%`} x2={`${month.left}%`} y1="0" y2="100%" className="stroke-border" />
      ))}
      {timeline.today !== null ? <line x1={`${timeline.today}%`} x2={`${timeline.today}%`} y1="0" y2="100%" className="stroke-accent" strokeWidth={1.5} /> : null}
      {span && item ? <rect x={`${span.left}%`} width={`${span.width}%`} y="6" height="12" rx="6" className={STATUS[item.status].bar} /> : null}
    </svg>
  );
}

function Row({ item, timeline }: { item: RoadmapItem; timeline: Timeline | null }) {
  const meta = [item.owner, dates(item)].filter(Boolean).join(' · ');
  return (
    <div className="grid grid-cols-3 items-center gap-4 rounded-md px-2 py-1.5 hover:bg-text/5">
      <div className={cn('flex min-w-0 items-start gap-2', !timeline && 'col-span-3')}>
        <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', STATUS[item.status].dot)} aria-hidden="true" />
        <div className="min-w-0">
          <div className={cn('truncate text-base text-text', item.status === 'cancelled' && 'text-text-tertiary line-through')}>{item.title}</div>
          <div className="truncate text-xs text-text-tertiary">
            {STATUS[item.status].label}
            {meta ? ` · ${meta}` : ''}
          </div>
        </div>
      </div>
      {timeline ? (
        <div className="col-span-2">
          <Track timeline={timeline} item={item} />
        </div>
      ) : null}
    </div>
  );
}

export default function RoadmapView({ value }: { value: Roadmap }) {
  const timeline = useMemo(() => buildTimeline(value.items), [value.items]);
  const groups = useMemo(() => groupByLane(value), [value]);
  const done = value.items.filter((item) => item.status === 'done').length;

  return (
    <div className="font-sans">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold text-text">{value.title || 'Roadmap'}</div>
          {value.timeframe ? <div className="text-sm text-text-secondary">{value.timeframe}</div> : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 text-sm text-text-secondary">
          <span className="tabular-nums">
            {done} of {value.items.length} done
          </span>
          <svg className="h-1 w-24 overflow-hidden rounded-full" aria-hidden="true">
            <rect width="100%" height="100%" className="fill-text/10" />
            <rect width={`${(done / value.items.length) * 100}%`} height="100%" className="fill-success" />
          </svg>
        </div>
      </div>

      {timeline ? (
        <div className="grid grid-cols-3 gap-4 px-2">
          <div className="col-span-2 col-start-2">
            <svg className="h-5 w-full overflow-visible" aria-hidden="true">
              {timeline.months.map((month) => (
                <text key={month.label} x={`${month.left}%`} dx="4" y="14" className="fill-text-tertiary text-xs">
                  {month.label}
                </text>
              ))}
            </svg>
          </div>
        </div>
      ) : null}

      {groups.map(({ lane, items }) => (
        <section key={lane?.id ?? 'other'} className="mt-2" aria-label={lane?.label ?? 'Other'}>
          {groups.length > 1 || lane ? <div className="px-2 pb-1 pt-2 text-sm font-medium text-text-secondary">{lane?.label ?? 'Other'}</div> : null}
          {items.length ? (
            items.map((item) => <Row key={item.id} item={item} timeline={timeline} />)
          ) : (
            <div className="px-2 py-1.5 text-sm text-text-tertiary">Nothing in this lane yet</div>
          )}
        </section>
      ))}
    </div>
  );
}
