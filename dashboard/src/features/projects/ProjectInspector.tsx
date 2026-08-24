import { useState } from 'react';
import { format, parse } from 'date-fns';
import { ChevronDown, FolderOpen, GitBranch } from 'lucide-react';
import { getAllowedStatusesForType } from '@shared/spec/artifact-rules';
import type { ProjectWithStats } from '../../hooks/useProjects';
import type { Artifact } from '../../types/artifacts';
import { ArtifactType, TodoPriority, TodoStatus } from '../../types/artifacts';
import { dateOnly } from '../../hooks/projectStats';
import { useArtifactsStore } from '../../store/artifacts';
import { getTypeLabel } from '../../utils/typeIcons';
import { Calendar } from '../../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { localDateStamp } from '../today/todaySelectors';
import { cn } from '../../lib/utils';
import { shortDate } from './format';
import { ProjectInspectorTags } from './ProjectInspectorTags';
import { ProjectVitals } from './ProjectVitals';
import { projectBaseArtifact, useArtifactEdit, useProjectStatus } from './projectMutations';

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="chronicle-inspector-prop">
      <span className="chronicle-inspector-key">{label}</span>
      {children}
    </div>
  );
}

/** Status menu driven by the artifact spec's allowed statuses for the type. */
function StatusControl({ artifact }: { artifact: Artifact }) {
  const { applyEdit } = useArtifactEdit();
  const statuses = getAllowedStatusesForType(artifact.type);
  const current = String(artifact.status ?? statuses[0]);

  const setStatus = (status: string) => {
    if (status === current) return;
    const changes: Partial<Artifact> = { status: status as Artifact['status'] };
    if (status === TodoStatus.DONE) changes.completedDate = localDateStamp();
    else if (current === TodoStatus.DONE) changes.completedDate = undefined;
    void applyEdit(artifact, changes, `Mark ${status}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="chronicle-inspector-trigger"
          aria-label={`Change status, currently ${current}`}
        >
          {current}
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={current} onValueChange={setStatus}>
          {statuses.map((status) => (
            <DropdownMenuRadioItem key={status} value={status}>
              {capitalize(status)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PriorityControl({ artifact }: { artifact: Artifact }) {
  const { applyEdit } = useArtifactEdit();
  const current = artifact.priority ?? '';

  const setPriority = (value: string) => {
    void applyEdit(
      artifact,
      { priority: value ? (value as TodoPriority) : undefined },
      value ? `Priority ${value}` : 'Clear priority',
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn('chronicle-inspector-trigger', current === 'high' && 'is-risk')}
          aria-label={`Change priority, currently ${current || 'none'}`}
        >
          {current || 'none'}
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={current} onValueChange={setPriority}>
          {Object.values(TodoPriority).map((priority) => (
            <DropdownMenuRadioItem key={priority} value={priority}>
              {capitalize(priority)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem inset onSelect={() => setPriority('')}>
          None
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DateControl({
  value,
  overdue,
  onPick,
  label,
}: {
  value?: string;
  overdue?: boolean;
  onPick: (next: string | undefined) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const day = dateOnly(value);

  const pick = (next: string | undefined) => {
    setOpen(false);
    onPick(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn('chronicle-inspector-trigger', overdue && 'is-risk')}
          aria-label={day ? `Change ${label}, currently ${shortDate(day)}` : `Set ${label}`}
        >
          {day ? shortDate(day) : 'none'}
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={day ? parse(day, 'yyyy-MM-dd', new Date()) : undefined}
          onSelect={(date) => pick(date ? format(date, 'yyyy-MM-dd') : undefined)}
          initialFocus
        />
        {day ? (
          <button
            type="button"
            onClick={() => pick(undefined)}
            className="w-full border-t border-border py-2 font-mono text-3xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
          >
            Clear {label}
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

interface ProjectInspectorProps {
  project: ProjectWithStats;
  item: Artifact | null;
  onOpenArtifact: (artifact: Artifact) => void;
}

/**
 * The right pane: every property of whatever the center shows — the selected
 * artifact, or the project itself. All selection happens through menus and
 * the calendar; free text is reserved for tags.
 */
export function ProjectInspector({ project, item, onOpenArtifact }: ProjectInspectorProps) {
  const artifacts = useArtifactsStore((state) => state.artifacts);
  const { applyEdit } = useArtifactEdit();
  const { setProjectStatus } = useProjectStatus();

  if (!item) {
    // The project is an artifact too: its own properties live here.
    const base = projectBaseArtifact(project.id);
    const projectStatuses = getAllowedStatusesForType(ArtifactType.PROJECT);
    const current = String(project.status ?? 'active');
    return (
      <div className="chronicle-inspector-body">
        <Prop label="Status">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="chronicle-inspector-trigger"
                aria-label={`Change project status, currently ${current}`}
              >
                {current}
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={current}
                onValueChange={(status) => setProjectStatus(project.id, status)}
              >
                {projectStatuses.map((status) => (
                  <DropdownMenuRadioItem key={status} value={status}>
                    {capitalize(status)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </Prop>
        {/* Projects have no deadline property. Legacy `due` frontmatter is
            preserved on disk but never displayed or edited here. */}
        <Prop label="Progress">
          <ProjectVitals project={project} />
        </Prop>
        {base ? (
          <Prop label="Tags">
            <ProjectInspectorTags artifact={base} />
          </Prop>
        ) : null}
        {project.repoUrl ? (
          <Prop label="Repository">
            <button
              className="chronicle-inspector-link"
              onClick={() => void window.electronAPI.openExternalUrl(project.repoUrl!)}
              title={project.repoUrl}
            >
              <GitBranch className="h-3 w-3" aria-hidden="true" />
              <span>{project.repoUrl.replace(/^https?:\/\//, '')}</span>
            </button>
          </Prop>
        ) : null}
        {/* The file is already open here — the path reveals it in Finder
            rather than re-opening it somewhere else in the app. */}
        <Prop label="File">
          <button
            className="chronicle-inspector-link"
            onClick={() => void window.electronAPI.showItemInFolder(project.filePath)}
            title="Reveal in Finder"
          >
            <FolderOpen className="h-3 w-3" aria-hidden="true" />
            <span>{project.filePath}</span>
          </button>
        </Prop>
      </div>
    );
  }

  const isTodo = item.type === ArtifactType.TODO;
  const due = dateOnly(item.due);
  const overdue = due !== null && due < localDateStamp() && item.status !== TodoStatus.DONE;
  const related = (item.related ?? [])
    .map((id) => artifacts.find((artifact) => artifact.id === id))
    .filter((artifact): artifact is Artifact => Boolean(artifact));
  const dateline = [
    shortDate(item.created) ? `created ${shortDate(item.created)}` : null,
    shortDate(item.updated) ? `edited ${shortDate(item.updated)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="chronicle-inspector-body">
      <Prop label="Status">
        <StatusControl artifact={item} />
      </Prop>
      {isTodo ? (
        <>
          <Prop label="Priority">
            <PriorityControl artifact={item} />
          </Prop>
          <Prop label="Due">
            <DateControl
              label="due date"
              value={item.due}
              overdue={overdue}
              onPick={(next) =>
                void applyEdit(
                  item,
                  { due: next },
                  next ? `Due ${shortDate(next)}` : 'Clear due date',
                )
              }
            />
          </Prop>
        </>
      ) : null}
      <Prop label="Tags">
        <ProjectInspectorTags artifact={item} />
      </Prop>
      {related.length > 0 ? (
        <Prop label="Related">
          <div className="chronicle-inspector-related">
            {related.map((artifact) => (
              <button
                key={artifact.id}
                onClick={() => onOpenArtifact(artifact)}
                title={artifact.title}
              >
                <span className="chronicle-inspector-related-kind">
                  {getTypeLabel(artifact.type)}
                </span>
                <span className="chronicle-inspector-related-title">{artifact.title}</span>
              </button>
            ))}
          </div>
        </Prop>
      ) : null}
      {dateline ? (
        <Prop label="Record">
          <span className="chronicle-inspector-garnish">{dateline}</span>
        </Prop>
      ) : null}
      <Prop label="File">
        <button
          className="chronicle-inspector-link"
          onClick={() => void window.electronAPI.showItemInFolder(item.filePath)}
          title="Reveal in Finder"
        >
          <FolderOpen className="h-3 w-3" aria-hidden="true" />
          <span>{item.filePath}</span>
        </button>
      </Prop>
    </div>
  );
}
