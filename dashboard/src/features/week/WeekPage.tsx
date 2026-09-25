import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarRange, Check, ChevronLeft, ChevronRight, FileEdit, FileText } from 'lucide-react';
import { dayOf, formatLocalDate, parseLocalDate, shiftDate } from '@shared/date';
import type { ArtifactSummary } from '@shared/types';
import { toItemUrl, toPageUrl, toWeekUrl } from '../../app/navigation';
import { useDataStatus, useWeek } from '../../data/selectors';
import { Button, EmptyState, Icon, IconButton, ListRow, LoadingState, PageHeader, PageLayout, SectionHeader } from '../../ui';
import { firstLines } from '../journal/entries';
import { weekStartOf } from '../rituals/weekly';
import { ProjectDot } from '../tasks/ProjectDot';
import { useProjectRefs } from '../tasks/projectRefs';

const JOURNAL_LINES = 4;

/** "September 21 – 27", "September 28 – October 4", with the year when it isn't this year. */
function weekRange(start: string, end: string): string {
  const from = parseLocalDate(start);
  const to = parseLocalDate(end);
  const year = from.getFullYear() !== new Date().getFullYear() ? `, ${to.getFullYear()}` : '';
  return from.getMonth() === to.getMonth()
    ? `${format(from, 'MMMM d')} – ${format(to, 'd')}${year}`
    : `${format(from, 'MMMM d')} – ${format(to, 'MMMM d')}${year}`;
}

const weekday = (stamp?: string) => (stamp ? format(parseLocalDate(stamp), 'EEEE') : undefined);

/** The day a task was finished within the week (a repeating task's latest completion). */
function finishedOn(task: ArtifactSummary, start: string, end: string): string | undefined {
  const days = [dayOf(task.completedDate), ...(task.completions ?? []).map(dayOf)].filter(
    (day): day is string => day !== undefined && day >= start && day <= end,
  );
  return days.sort().at(-1);
}

/** Its local day, for timestamps and bare dates alike. */
const localDay = (value: string) => (value.length > 10 ? formatLocalDate(new Date(value)) : value);

function GroupHeading({ project }: { project: string | null }) {
  const ref = useProjectRefs().find(project);
  return (
    <h3 className="flex items-center gap-2 px-3 pb-1 pt-3 text-xs font-medium text-text-tertiary">
      {ref ? <ProjectDot color={ref.color} /> : null}
      {ref?.title ?? (project ? project : 'Not in a project')}
    </h3>
  );
}

/**
 * What moved: a plain look back at one week. Tasks finished, notes written or
 * edited, and lines from the journal, grouped by project. A list, not a
 * score; weeks are never compared.
 */
export default function WeekPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const status = useDataStatus();
  const thisWeek = weekStartOf();
  const asked = params.get('week');
  const start = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? weekStartOf(asked) : thisWeek;
  const week = useWeek(start);
  const refs = useProjectRefs();
  const isThisWeek = start === thisWeek;

  const finishedGroups = week.groups.filter((group) => group.finished.length > 0);
  const notes = week.groups.flatMap((group) => [
    ...group.written.map((note) => ({ note, verb: 'Written', day: localDay(note.created) })),
    ...group.edited.map((note) => ({ note, verb: 'Edited', day: localDay(note.updated) })),
  ]);
  notes.sort((a, b) => b.day.localeCompare(a.day) || a.note.title.localeCompare(b.note.title));
  const finishedCount = finishedGroups.reduce((sum, group) => sum + group.finished.length, 0);
  const empty = finishedCount === 0 && notes.length === 0 && week.journal.length === 0;

  const go = (weekStart: string) => navigate(weekStart === thisWeek ? toWeekUrl() : toWeekUrl(weekStart));

  return (
    <PageLayout className="gap-10">
      <PageHeader
        title="What moved"
        subtitle={[isThisWeek ? 'This week' : start === shiftDate(thisWeek, -7) ? 'Last week' : null, weekRange(week.start, week.end)]
          .filter(Boolean)
          .join(' · ')}
        className="px-2"
        actions={
          <>
            {isThisWeek ? null : (
              <Button variant="ghost" size="sm" onClick={() => go(thisWeek)}>
                This week
              </Button>
            )}
            <IconButton icon={ChevronLeft} label="Previous week" onClick={() => go(shiftDate(start, -7))} />
            <IconButton icon={ChevronRight} label="Next week" disabled={isThisWeek} onClick={() => go(shiftDate(start, 7))} />
          </>
        }
      />

      {status !== 'ready' ? (
        <LoadingState rows={6} />
      ) : empty ? (
        <EmptyState
          icon={CalendarRange}
          title={isThisWeek ? 'This week is just getting going.' : 'A quiet week on paper.'}
          description={
            isThisWeek
              ? 'Finished tasks, notes you write, and journal lines will gather here as the days go by.'
              : 'Nothing was finished or written here that week. Rest and thinking count too.'
          }
          action={
            <Button leadingIcon={ChevronLeft} onClick={() => go(shiftDate(start, -7))}>
              The week before
            </Button>
          }
        />
      ) : (
        <>
          {finishedGroups.length > 0 ? (
            <section aria-label="Finished" className="flex flex-col">
              <SectionHeader title="Finished" count={finishedCount} className="px-2" />
              {finishedGroups.map((group) => (
                <div key={group.project ?? ''} className="flex flex-col">
                  <GroupHeading project={group.project} />
                  {[...group.finished]
                    .sort((a, b) => (finishedOn(a, week.start, week.end) ?? '').localeCompare(finishedOn(b, week.start, week.end) ?? ''))
                    .map((task) => (
                    <ListRow
                      key={task.filePath}
                      leading={
                        <span className="grid size-4.5 place-items-center rounded-full bg-accent-soft text-accent-text">
                          <Icon icon={Check} size="sm" strokeWidth={2.5} />
                        </span>
                      }
                      meta={weekday(finishedOn(task, week.start, week.end))}
                      onActivate={() => navigate(toItemUrl(task))}
                    >
                      {task.title}
                    </ListRow>
                  ))}
                </div>
              ))}
            </section>
          ) : null}

          {notes.length > 0 ? (
            <section aria-label="Written" className="flex flex-col">
              <SectionHeader title="Written" count={notes.length} className="px-2" />
              {notes.map(({ note, verb, day }) => {
                const project = refs.find(note.project);
                return (
                  <ListRow
                    key={note.filePath}
                    leading={<Icon icon={verb === 'Written' ? FileText : FileEdit} className="text-text-tertiary" />}
                    meta={
                      <span className="flex items-center gap-3">
                        {project ? (
                          <span className="flex items-center gap-1.5">
                            <ProjectDot color={project.color} />
                            {project.title}
                          </span>
                        ) : null}
                        <span>
                          {verb} {weekday(day)}
                        </span>
                      </span>
                    }
                    onActivate={() => navigate(toItemUrl(note))}
                  >
                    {note.title || 'Untitled'}
                  </ListRow>
                );
              })}
            </section>
          ) : null}

          {week.journal.length > 0 ? (
            <section aria-label="From your journal" className="flex flex-col gap-2">
              <SectionHeader title="From your journal" className="px-2" />
              {week.journal.map((entry) => (
                <Link
                  key={entry.date}
                  to={toPageUrl(entry.path)}
                  className="flex flex-col gap-1.5 rounded-lg px-4 py-3 transition-colors duration-fast ease-out hover:bg-text/5"
                >
                  <span className="text-sm font-medium text-text-secondary">{weekday(entry.date)}</span>
                  <span className="flex flex-col gap-1 border-l-2 border-accent-soft pl-3">
                    {firstLines(entry.lines.join('\n'), JOURNAL_LINES).map((line, index) => (
                      <span key={index} className="font-reading text-md text-text">
                        {line}
                      </span>
                    ))}
                  </span>
                </Link>
              ))}
            </section>
          ) : null}
        </>
      )}
    </PageLayout>
  );
}
