import { useMemo, useRef, useState, type DragEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { MoreHorizontal, Plus } from 'lucide-react';
import { projectSwatchFor } from '@shared/design-system/accents';
import type { ArtifactSummary } from '@shared/types';
import { toProjectUrl } from '../../../app/navigation';
import { sections } from '../../../app/routes';
import { useArtifacts } from '../../../data/selectors';
import { dragHasArtifact, readArtifactDragData } from '../../../lib/artifactDnd';
import {
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
  IconButton,
  Input,
  Menu,
  MenuContent,
  MenuTrigger,
  cn,
} from '../../../ui';
import { useCreate } from '../useCreate';
import { DeleteProjectDialog } from './DeleteProjectDialog';
import { ProjectMenuItems } from './ProjectMenuItems';
import { SidebarLink } from './SidebarLink';
import { renameProject, sidebarProjects, moveIntoProject } from './projectActions';

const preloadProjects = sections.find((section) => section.id === 'projects')?.preload;

function ProjectDot({ project }: { project: ArtifactSummary }) {
  return <span className="size-2 rounded-full" style={{ background: projectSwatchFor(project.title, project.swatch).hex }} />;
}

/** Accept items dragged from any list; dropping moves them into the project. */
function useDropTarget(project: ArtifactSummary) {
  const [over, setOver] = useState(false);
  return {
    over,
    handlers: {
      onDragOver: (event: DragEvent) => {
        if (!dragHasArtifact(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setOver(true);
      },
      onDragLeave: () => setOver(false),
      onDrop: (event: DragEvent) => {
        setOver(false);
        const payload = readArtifactDragData(event);
        if (!payload) return;
        event.preventDefault();
        void moveIntoProject(payload.id, project);
      },
    },
  };
}

function ProjectRow({ project, rail }: { project: ArtifactSummary; rail: boolean }) {
  const { pathname } = useLocation();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const committed = useRef(false);
  const { over, handlers } = useDropTarget(project);
  const url = toProjectUrl(project.id);

  // Menus hand focus back to their trigger as they close; start these afterwards.
  const startRename = () =>
    setTimeout(() => {
      committed.current = false;
      setRenaming(true);
    }, 0);
  const startDelete = () => setTimeout(() => setDeleting(true), 0);
  const finishRename = (value: string | null) => {
    if (committed.current) return;
    committed.current = true;
    setRenaming(false);
    if (value !== null) renameProject(project, value);
  };

  if (renaming && !rail) {
    return (
      <div className="flex h-8 items-center gap-3 rounded-md bg-raised px-2 shadow-raised">
        <span className="flex size-4 shrink-0 items-center justify-center">
          <ProjectDot project={project} />
        </span>
        <Input
          autoFocus
          variant="ghost"
          size="sm"
          defaultValue={project.title}
          aria-label={`Rename ${project.title}`}
          className="-ml-1 h-7 px-1 hover:bg-transparent focus-visible:bg-transparent"
          onFocus={(event) => event.currentTarget.select()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') finishRename(event.currentTarget.value);
            if (event.key === 'Escape') finishRename(null);
          }}
          onBlur={(event) => finishRename(event.currentTarget.value)}
        />
      </div>
    );
  }

  const items = <ProjectMenuItems project={project} onRename={startRename} onDelete={startDelete} />;

  return (
    <div className="group/project relative">
      <ContextMenu>
        <SidebarLink
          to={url}
          label={project.title}
          leading={<ProjectDot project={project} />}
          active={pathname === url}
          rail={rail}
          onMouseEnter={preloadProjects}
          onFocus={preloadProjects}
          className={cn(!rail && 'pr-8', over && 'bg-accent-soft text-text ring-2 ring-focus')}
          wrap={(link) => <ContextMenuTrigger asChild>{link}</ContextMenuTrigger>}
          {...handlers}
        />
        <ContextMenuContent>{items}</ContextMenuContent>
      </ContextMenu>
      {rail ? null : (
        <Menu>
          <MenuTrigger asChild>
            <IconButton
              icon={MoreHorizontal}
              label={`${project.title} options`}
              size="sm"
              className="absolute right-0.5 top-0.5 opacity-0 focus-visible:opacity-100 group-hover/project:opacity-100 data-[state=open]:opacity-100"
            />
          </MenuTrigger>
          <MenuContent align="start">{items}</MenuContent>
        </Menu>
      )}
      <DeleteProjectDialog project={project} open={deleting} onOpenChange={setDeleting} />
    </div>
  );
}

/** Active projects under the navigation, with an inline way to start a new one. */
export function SidebarProjects({ rail }: { rail: boolean }) {
  const artifacts = useArtifacts();
  const projects = useMemo(() => sidebarProjects(artifacts), [artifacts]);
  const { newProject } = useCreate();

  return (
    <section aria-label="Projects" className="flex flex-col gap-0.5">
      {rail ? (
        <div className="mx-auto my-2 h-px w-6 bg-border" aria-hidden="true" />
      ) : (
        <h2 className="flex h-8 items-center px-2 pt-2 text-sm font-medium text-text-secondary">Projects</h2>
      )}
      {projects.map((project) => (
        <ProjectRow key={project.filePath} project={project} rail={rail} />
      ))}
      {rail ? (
        <IconButton icon={Plus} label="New project" className="mx-auto w-9" onClick={() => void newProject()} />
      ) : (
        <Button
          variant="ghost"
          leadingIcon={Plus}
          className="justify-start gap-3 px-2 font-normal text-text-tertiary"
          onClick={() => void newProject()}
        >
          New project
        </Button>
      )}
    </section>
  );
}
