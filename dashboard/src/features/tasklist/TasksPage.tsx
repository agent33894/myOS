import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ListTodo } from 'lucide-react';
import { groupByArea, groupByProject, type TaskGroup } from '@shared/tasks';
import type { ArtifactSummary } from '@shared/types';
import { useDataStatus, useTasks } from '../../data/selectors';
import { Button, EmptyState, LoadingState, PageHeader, PageLayout, SectionHeader, SegmentedControl } from '../../ui';
import { AddTask } from '../tasks/AddTask';
import { EntryList } from '../tasks/EntryList';
import { ProjectDot } from '../tasks/ProjectDot';
import { useProjectRefs } from '../tasks/projectRefs';

type Grouping = 'project' | 'area';

const GROUPING_KEY = 'myos-tasks-grouping';
const GROUPINGS = [
  { value: 'project', label: 'Project' },
  { value: 'area', label: 'Area' },
] as const;

function storedGrouping(): Grouping {
  try {
    return localStorage.getItem(GROUPING_KEY) === 'area' ? 'area' : 'project';
  } catch {
    return 'project';
  }
}

/** A section's tasks, under quiet project or area labels. */
function Groups({ groups, grouping, someday = false }: { groups: TaskGroup<ArtifactSummary>[]; grouping: Grouping; someday?: boolean }) {
  const projects = useProjectRefs();
  // One group with no project or area needs no label.
  if (groups.length === 1 && groups[0].key === null) return <EntryList entries={groups[0].items} someday={someday} />;
  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => {
        const color = grouping === 'project' && group.key ? projects.find(group.key)?.color : undefined;
        return (
          <div key={group.key ?? 'none'}>
            <h3 className="flex items-center gap-2 px-2 pb-1 pt-2 text-xs font-medium text-text-tertiary">
              {color ? <ProjectDot color={color} /> : null}
              {group.label}
            </h3>
            <EntryList entries={group.items} hideProject={grouping === 'project' && group.key !== null} someday={someday} />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Every open task that Today doesn't show: Anytime (no date), Upcoming
 * (beyond this week, or deferred), and Someday, grouped by project or area.
 * With Today, every task has one visible home.
 */
export default function TasksPage() {
  const { anytime, upcoming, someday } = useTasks();
  const status = useDataStatus();
  const projects = useProjectRefs();
  const [grouping, setGrouping] = useState<Grouping>(storedGrouping);
  const [showSomeday, setShowSomeday] = useState(true);

  const group = useMemo(
    () => (items: ArtifactSummary[]) => (grouping === 'project' ? groupByProject(items, projects.all) : groupByArea(items)),
    [grouping, projects],
  );
  const sections = useMemo(
    () => ({ anytime: group(anytime), upcoming: group(upcoming), someday: group(someday) }),
    [group, anytime, upcoming, someday],
  );

  const choose = (next: Grouping) => {
    setGrouping(next);
    try {
      localStorage.setItem(GROUPING_KEY, next);
    } catch {
      // The choice just won't survive a restart.
    }
  };

  const empty = anytime.length + upcoming.length + someday.length === 0;

  return (
    <PageLayout className="gap-8">
      <PageHeader
        title="Tasks"
        subtitle="Tasks without a date, later tasks, and Someday."
        actions={
          empty ? null : (
            <SegmentedControl size="sm" aria-label="Group by" options={GROUPINGS} value={grouping} onValueChange={choose} />
          )
        }
        className="px-2"
      />

      {status !== 'ready' ? (
        <LoadingState rows={6} />
      ) : (
        <>
          <section aria-label="Anytime">
            {empty ? (
              <EmptyState
                icon={ListTodo}
                title="Nothing waiting."
                description="Tasks without a date live here, with anything you park for someday."
                className="py-10"
              />
            ) : (
              <>
                <SectionHeader title="Anytime" count={anytime.length} className="px-2" />
                {anytime.length === 0 ? (
                  <p className="px-2 pb-1 text-sm text-text-tertiary">Tasks without a date land here.</p>
                ) : (
                  <Groups groups={sections.anytime} grouping={grouping} />
                )}
              </>
            )}
            <AddTask placeholder="Add a task… (no date needed)" />
          </section>

          {upcoming.length > 0 ? (
            <section aria-label="Upcoming">
              <SectionHeader title="Upcoming" count={upcoming.length} className="px-2" />
              <p className="px-2 pb-1 text-sm text-text-tertiary">Dated after this week.</p>
              <Groups groups={sections.upcoming} grouping={grouping} />
            </section>
          ) : null}

          {someday.length > 0 ? (
            <section aria-label="Someday">
              <SectionHeader
                title="Someday"
                count={someday.length}
                className="px-2"
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    leadingIcon={showSomeday ? ChevronDown : ChevronRight}
                    aria-expanded={showSomeday}
                    onClick={() => setShowSomeday((shown) => !shown)}
                  >
                    {showSomeday ? 'Hide' : 'Show'}
                  </Button>
                }
              />
              {showSomeday ? <Groups groups={sections.someday} grouping={grouping} someday /> : null}
            </section>
          ) : null}
        </>
      )}
    </PageLayout>
  );
}
