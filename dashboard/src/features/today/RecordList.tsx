import { memo, useMemo } from 'react';
import type { Artifact } from '../../types/artifacts';
import { cn } from '../../lib/utils';
import { localDateStamp, recordDateStamp, recordKind, type RecordKind } from './todaySelectors';
import { ChronicleCheckmark } from './ChronicleCheckmark';
import { useProjectLabel } from '../../hooks/useProjectLabel';

interface RecordListProps {
  items: Artifact[];
  allArtifacts: Artifact[];
  selectedId: string | null;
  /** id -> timestamp for rows that just crossed the now line. */
  arriving: Map<string, string>;
  completionTimes: Record<string, string>;
  onSelect: (artifact: Artifact) => void;
}

const EMPTY_CHILDREN: Artifact[] = [];

export function RecordList({
  items,
  allArtifacts,
  selectedId,
  arriving,
  completionTimes,
  onSelect,
}: RecordListProps) {
  const groups = useMemo(() => groupByDay(items), [items]);
  const doneChildrenByParent = useMemo(() => {
    const map = new Map<string, Artifact[]>();
    for (const artifact of allArtifacts) {
      if (!artifact.parentId || artifact.status !== 'done') continue;
      const group = map.get(artifact.parentId);
      if (group) group.push(artifact);
      else map.set(artifact.parentId, [artifact]);
    }
    return map;
  }, [allArtifacts]);

  return (
    <section aria-labelledby="record-heading">
      <div className="chronicle-list-heading">
        <span id="record-heading">The Record</span>
        <span key={items.length} className="chronicle-count">{items.length}</span>
      </div>
      {items.length === 0 ? <p className="chronicle-empty-row">Nothing recorded yet.</p> : null}
      {groups.map(([day, dayItems]) => (
        <section key={day} className="chronicle-record-day" aria-labelledby={`record-day-${day}`}>
          <header className="chronicle-record-day-header">
            <h3 id={`record-day-${day}`}>{formatDayTitle(day)}</h3>
            <span className="chronicle-garnish">
              {dayItems.length} {dayItems.length === 1 ? 'entry' : 'entries'}
            </span>
          </header>
          <p className="chronicle-record-dateline">{buildDateline(day, dayItems)}</p>
          {dayItems.map((item) => (
            <RecordRow
              key={item.id}
              item={item}
              children={doneChildrenByParent.get(item.id) || EMPTY_CHILDREN}
              selected={selectedId === item.id}
              arriving={arriving.has(item.id)}
              displayTimestamp={arriving.get(item.id) || completionTimes[item.id]}
              onSelect={onSelect}
            />
          ))}
        </section>
      ))}
    </section>
  );
}

const RecordRow = memo(function RecordRow({
  item,
  children,
  selected,
  arriving,
  displayTimestamp,
  onSelect,
}: {
  item: Artifact;
  children: Artifact[];
  selected: boolean;
  arriving: boolean;
  displayTimestamp?: string | null;
  onSelect: (artifact: Artifact) => void;
}) {
  const kind = recordKind(item) || 'capture';
  const projectLabel = useProjectLabel();
  const project = projectLabel(item.project) || item.tags?.[0] || 'myOS';
  const label =
    kind === 'completed' ? 'Closed' : kind === 'session' ? 'Session' : kind === 'decision' ? 'Decision' : 'Captured';

  return (
    <button
      onClick={() => onSelect(item)}
      data-nav-id={item.id}
      className={cn('chronicle-record-row', `is-${kind}`, selected && 'is-selected', arriving && 'is-arriving')}
    >
      <time>{displayTimestamp || formatRecordTime(item)}</time>
      <span className="chronicle-record-content">
        <RecordTitle item={item} kind={kind} />
        {children.length > 0 ? (
          <span className="chronicle-session-children">
            {children.map((child) => (
              <span key={child.id}>{child.title}</span>
            ))}
          </span>
        ) : null}
        <small>
          {label} · {project}
        </small>
      </span>
    </button>
  );
});

function RecordTitle({ item, kind }: { item: Artifact; kind: RecordKind }) {
  if (kind === 'capture')
    return (
      <strong className="chronicle-record-quote">
        <span className="chronicle-record-text">“{item.title}”</span>
      </strong>
    );
  if (kind === 'decision')
    return (
      <strong className="chronicle-record-decision">
        <span aria-hidden="true">§</span>
        <span className="chronicle-record-text">{item.title}</span>
      </strong>
    );
  if (kind === 'session') {
    return (
      <span className="chronicle-record-session-title">
        <span className="chronicle-stamp-label">
          Session
          {item.estimatedMinutes ? ` — ${item.estimatedMinutes} min` : ''}
        </span>
        <strong>
          <span className="chronicle-record-text">{item.title}</span>
        </strong>
      </span>
    );
  }
  return (
    <strong className="chronicle-record-completed">
      <ChronicleCheckmark />
      <span className="chronicle-record-text">{item.title}</span>
    </strong>
  );
}

function groupByDay(items: Artifact[]): Array<[string, Artifact[]]> {
  const groups = new Map<string, Artifact[]>();
  for (const item of items) {
    const day = recordDateStamp(item);
    const group = groups.get(day) || [];
    group.push(item);
    groups.set(day, group);
  }
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
}

function formatDayTitle(day: string): string {
  const date = new Date(`${day}T12:00:00`);
  if (day === localDateStamp()) return date.toLocaleDateString([], { month: 'long', day: 'numeric' });
  return date.toLocaleDateString([], {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildDateline(day: string, items: Artifact[]): string {
  const date = new Date(`${day}T12:00:00`);
  const counts = items.reduce(
    (summary, item) => {
      const kind = recordKind(item);
      if (kind) summary[kind] += 1;
      return summary;
    },
    { completed: 0, session: 0, capture: 0, decision: 0 } as Record<RecordKind, number>,
  );
  const parts = [date.toLocaleDateString([], { weekday: 'long' })];
  if (counts.completed) parts.push(`${counts.completed} closed`);
  if (counts.session) parts.push(`${counts.session} session${counts.session === 1 ? '' : 's'}`);
  const captured = counts.capture + counts.decision;
  if (captured) parts.push(`${captured} captured`);
  return parts.join(' · ');
}

function formatRecordTime(item: Artifact): string {
  const raw = item.updated || item.created;
  if (!raw || !raw.includes('T')) return '—';
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—';
}
