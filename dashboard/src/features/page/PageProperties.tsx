import { CalendarDays, CheckCircle2, FileText, Flag, FolderKanban, Moon } from 'lucide-react';
import { ArtifactType, TodoStatus, type ArtifactSummary } from '@shared/types';
import { defer, moveToProject, retype, setDue, setFlag } from '../../data/gateway';
import { Button, Checkbox, DatePicker, Pill, Property, PropertyRow, cn } from '../../ui';
import { attempt, completeTask, toastWithUndo } from '../tasks/actions';
import { dayLabel, dayOf, dueTone, fromDate, toDate } from '../tasks/dates';
import { ProjectDot } from '../tasks/ProjectDot';
import { ProjectPicker } from '../tasks/ProjectPicker';
import { useProjectRefs } from '../tasks/projectRefs';
import { kindLabel } from '../../lib/itemKinds';
import { AreaProperty } from '../files/slots';
import { KnowledgeProperties } from '../knowledge/slots';
import { PlanningTaskProperties } from '../planning/slots';
import { TagEditor } from './TagEditor';

function ProjectProperty({ item }: { item: ArtifactSummary }) {
  const project = useProjectRefs().find(item.project);
  return (
    <ProjectPicker value={item.project} onChange={(id) => attempt(moveToProject(item, id))}>
      <Property icon={FolderKanban} label="Project" placeholder="Project">
        {project ? (
          <span className="flex items-center gap-1.5">
            <ProjectDot color={project.color} />
            {project.title}
          </span>
        ) : (item.project ?? null)}
      </Property>
    </ProjectPicker>
  );
}

function TaskProperties({ task }: { task: ArtifactSummary }) {
  const done = task.status === TodoStatus.DONE;
  const due = dayOf(task.due);
  const deferred = dayOf(task.deferDate);
  return (
    <>
      <span className="inline-flex h-7 items-center gap-1 pl-1 pr-2 text-sm text-text-secondary">
        <Checkbox
          checked={done}
          onCheckedChange={() => void completeTask(task)}
          aria-label={done ? 'Reopen task' : 'Complete task'}
        />
        {done ? 'Done' : task.status === TodoStatus.IN_PROGRESS ? 'In progress' : 'To do'}
      </span>
      <DatePicker value={toDate(due)} onChange={(date) => attempt(setDue(task, fromDate(date)))}>
        <Property icon={CalendarDays} label="Due" placeholder="Due" tone={due && !done && dueTone(due) === 'overdue' ? 'danger' : 'default'}>
          {due ? dayLabel(due) : null}
        </Property>
      </DatePicker>
      <DatePicker value={toDate(deferred)} onChange={(date) => attempt(defer(task, fromDate(date)))}>
        <Property icon={Moon} label="Defer until" placeholder="Defer">
          {deferred ? `From ${dayLabel(deferred)}` : null}
        </Property>
      </DatePicker>
      <Property
        icon={Flag}
        label="Flag"
        placeholder="Flag"
        aria-pressed={Boolean(task.flagged)}
        onClick={() => attempt(setFlag(task, !task.flagged))}
        className={cn(task.flagged && 'text-warning hover:text-warning')}
      >
        {task.flagged ? 'Flagged' : null}
      </Property>
      <PlanningTaskProperties task={task} />
      <ProjectProperty item={task} />
      <TagEditor item={task} />
    </>
  );
}

interface MoveProps {
  /** Save pending edits before the file moves to its new folder. */
  flush: () => Promise<void>;
  onMoved: (path: string) => void;
}

function CaptureActions({ item, flush, onMoved }: MoveProps & { item: ArtifactSummary }) {
  const make = (type: ArtifactType.TODO | ArtifactType.MEMO) => {
    const task = type === ArtifactType.TODO;
    const label = task ? `Make “${item.title}” a task` : `Make “${item.title}” a note`;
    attempt(
      flush()
        .then(() => retype(item.filePath, { type }, label))
        .then((artifact) => {
          onMoved(artifact.filePath);
          toastWithUndo(task ? 'Made a task' : 'Made a note');
        }),
    );
  };
  return (
    <>
      <Pill className="mr-1">Inbox</Pill>
      <Button size="sm" variant="ghost" leadingIcon={CheckCircle2} onClick={() => make(ArtifactType.TODO)}>
        Make task
      </Button>
      <Button size="sm" variant="ghost" leadingIcon={FileText} onClick={() => make(ArtifactType.MEMO)}>
        Make note
      </Button>
    </>
  );
}

/** The inline properties under a page's title, by kind of item. */
export function PageProperties({ item, flush, onMoved }: MoveProps & { item: ArtifactSummary }) {
  const kind = kindLabel(item.type);
  return (
    <PropertyRow className="-ml-2">
      {item.type === ArtifactType.TODO ? (
        <TaskProperties task={item} />
      ) : item.type === ArtifactType.INBOX ? (
        <CaptureActions item={item} flush={flush} onMoved={onMoved} />
      ) : (
        <>
          {kind ? <Pill className="mr-1">{kind}</Pill> : null}
          <ProjectProperty item={item} />
          <TagEditor item={item} />
          <KnowledgeProperties item={item} />
        </>
      )}
      {item.type === ArtifactType.INBOX ? null : <AreaProperty item={item} flush={flush} onMoved={onMoved} />}
    </PropertyRow>
  );
}
