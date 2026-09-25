import { useState } from 'react';
import { format } from 'date-fns';
import { Archive, CalendarRange, CalendarX2, ChevronDown, Sun, Sunrise, type LucideIcon } from 'lucide-react';
import { dayOf, formatLocalDate, nextMonday, shiftDate } from '@shared/date';
import type { ArtifactSummary } from '@shared/types';
import { replan, type ReplanTarget } from '../../data/planning';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Icon,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
} from '../../ui';
import { attempt, toastWithUndo } from '../tasks/actions';
import { dayLabel, inSentence, toDate } from '../tasks/dates';
import { ProjectDot } from '../tasks/ProjectDot';
import { useProjectRefs } from '../tasks/projectRefs';

interface Choice {
  target: ReplanTarget;
  label: string;
  icon: LucideIcon;
  /** The day it lands on, shown quietly in the menu. */
  hint?: string;
}

function choices(): Choice[] {
  const today = formatLocalDate();
  const short = (stamp: string) => format(toDate(stamp)!, 'EEE d MMM');
  return [
    { target: 'today', label: 'Today', icon: Sun },
    { target: 'tomorrow', label: 'Tomorrow', icon: Sunrise, hint: short(shiftDate(today, 1)) },
    { target: 'next-week', label: 'Next week', icon: CalendarRange, hint: short(formatLocalDate(nextMonday())) },
    { target: 'someday', label: 'Someday', icon: Archive },
    { target: 'none', label: 'No date', icon: CalendarX2 },
  ];
}

const DONE_MESSAGE: Record<ReplanTarget, string> = {
  today: 'Moved to today',
  tomorrow: 'Moved to tomorrow',
  'next-week': 'Moved to next week',
  someday: 'Moved to Someday',
  none: 'Dates cleared · now in Tasks, Anytime',
};

interface ReplanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Carried-over tasks. */
  tasks: ArtifactSummary[];
  /** Carried-over checklist lines, which keep their dates in their notes. */
  checks: number;
}

/** Give each carried-over task a new day, or move them all at once. Each move is one undo step. */
export function ReplanDialog({ open, onOpenChange, tasks, checks }: ReplanDialogProps) {
  const projects = useProjectRefs();
  const [moved, setMoved] = useState(0);
  const options = choices();

  const move = (list: ArtifactSummary[], target: ReplanTarget) =>
    attempt(
      replan(list, target).then(() => {
        setMoved((count) => count + list.length);
        toastWithUndo(list.length > 1 ? `${DONE_MESSAGE[target]} · ${list.length} tasks` : DONE_MESSAGE[target]);
      }),
      'Could not re-plan',
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setMoved(0);
      }}
    >
      <DialogContent size="lg" className="gap-5">
        <DialogHeader>
          <DialogTitle>Re-plan carried over</DialogTitle>
          <DialogDescription>
            Pick a new day for each task, or move them all at once. Leaving something where it is is fine too.
          </DialogDescription>
        </DialogHeader>

        {tasks.length === 0 ? (
          <EmptyState
            icon={Sun}
            title={moved > 0 ? 'Everything has a new day.' : 'Nothing is carried over.'}
            description={moved > 0 ? `You re-planned ${moved === 1 ? 'one task' : `${moved} tasks`}.` : undefined}
            className="py-6"
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm text-text-secondary">{tasks.length === 1 ? 'Move it to' : `Move all ${tasks.length} to`}</span>
              {options.map((choice) => (
                <Button key={choice.target} size="sm" leadingIcon={choice.icon} onClick={() => move(tasks, choice.target)}>
                  {choice.label}
                </Button>
              ))}
            </div>
            <div role="list" aria-label="Carried over" className="-mx-2 flex max-h-96 flex-col overflow-y-auto">
              {tasks.map((task) => {
                const project = projects.find(task.project);
                const since = dayOf(task.due) ?? dayOf(task.planned);
                return (
                  <div role="listitem" key={task.filePath} className="flex min-h-12 items-center gap-3 rounded-md px-2 py-1 hover:bg-text/5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base text-text">{task.title}</p>
                      <p className="flex min-w-0 items-center gap-3 text-sm text-text-tertiary">
                        {since ? <span>{task.due ? 'Was due' : 'Planned for'} {inSentence(dayLabel(since))}</span> : null}
                        {project ? (
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <ProjectDot color={project.color} />
                            <span className="truncate">{project.title}</span>
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <Menu>
                      <MenuTrigger asChild>
                        <Button size="sm" variant="ghost" aria-label={`Move “${task.title}” to…`}>
                          Move to
                          <Icon icon={ChevronDown} size="sm" />
                        </Button>
                      </MenuTrigger>
                      <MenuContent align="end">
                        {options.map((choice) => (
                          <MenuItem key={choice.target} icon={choice.icon} onSelect={() => move([task], choice.target)}>
                            <span className="flex items-center justify-between gap-4">
                              {choice.label}
                              {choice.hint ? <span className="text-sm text-text-tertiary">{choice.hint}</span> : null}
                            </span>
                          </MenuItem>
                        ))}
                      </MenuContent>
                    </Menu>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <DialogFooter className="justify-between">
          <p className="text-sm text-text-tertiary">
            {checks > 0
              ? `${checks === 1 ? 'One checklist item keeps its date' : `${checks} checklist items keep their dates`} in the note.`
              : null}
          </p>
          <Button variant={tasks.length === 0 ? 'primary' : 'secondary'} onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
