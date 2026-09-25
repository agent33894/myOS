import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CircleDot, Eye, EyeOff, FileText, Palette, Plus } from 'lucide-react';
import { projectSwatches } from '@shared/design-system/accents';
import { ArtifactType } from '@shared/types';
import { paths, toNoteUrl } from '../../app/navigation';
import { patch } from '../../data/gateway';
import type { ProjectWithStats } from '../../data/projects';
import { useDocument } from '../../data/useDocument';
import { Editor } from '../../editor';
import {
  Button,
  Icon,
  ListRow,
  LoadingState,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuTrigger,
  PageLayout,
  Property,
  PropertyRow,
  SectionHeader,
  Textarea,
} from '../../ui';
import { createNote } from '../notes/createNote';
import { documentBody } from '../page/documentBody';
import { ConflictBanner } from '../page/ConflictBanner';
import { kindLabel } from '../../lib/itemKinds';
import { PageMenu } from '../page/PageMenu';
import { PageTopBar } from '../page/PageTopBar';
import { SaveState } from '../page/SaveState';
import { TagEditor } from '../page/TagEditor';
import { useNewParam } from '../page/useNewParam';
import { attempt } from '../tasks/actions';
import { AddTask } from '../tasks/AddTask';
import { relativeTime } from '../tasks/dates';
import { ProjectDot } from '../tasks/ProjectDot';
import { projectColor } from '../tasks/projectRefs';
import { TaskRow } from '../tasks/TaskRow';
import { useRenameWithTitle } from '../files/useRenameWithTitle';
import { PROJECT_STATUSES, statusLabel } from './projectStatus';
import { useProjectRename } from './projectRename';
import { useProjectStatus } from './projectMutations';

function ProjectTitle({ project, autoFocus }: { project: ProjectWithStats; autoFocus: boolean }) {
  const { rename } = useProjectRename();
  const [title, setTitle] = useState(project.title);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setTitle(project.title), [project.title]);
  useEffect(() => {
    if (!autoFocus) return;
    ref.current?.focus();
    ref.current?.select();
  }, [autoFocus]);

  const commit = () => {
    if (title.trim() && title.trim() !== project.title) void rename(project, title);
    else setTitle(project.title);
  };
  return (
    <Textarea
      ref={ref}
      autosize
      variant="ghost"
      value={title}
      onChange={(event) => setTitle(event.target.value.replace(/\n/g, ' '))}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      placeholder="Project name"
      aria-label="Project name"
      className="px-0 text-2xl font-semibold hover:bg-transparent focus-visible:bg-transparent"
    />
  );
}

function ProjectProperties({ project }: { project: ProjectWithStats }) {
  const { setProjectStatus } = useProjectStatus();
  const color = projectColor(project);
  const swatch = projectSwatches.find((option) => option.hex === color);
  return (
    <PropertyRow className="-ml-2">
      <Menu>
        <MenuTrigger asChild>
          <Property icon={CircleDot} label="Status">
            {statusLabel(project.status)}
          </Property>
        </MenuTrigger>
        <MenuContent align="start">
          {PROJECT_STATUSES.map((option) => (
            <MenuCheckboxItem
              key={option.value}
              checked={project.status === option.value}
              onCheckedChange={() => setProjectStatus(project.id, option.value)}
            >
              {option.label}
            </MenuCheckboxItem>
          ))}
        </MenuContent>
      </Menu>
      <Menu>
        <MenuTrigger asChild>
          <Property icon={Palette} label="Color">
            <span className="flex items-center gap-1.5">
              <ProjectDot color={color} />
              {swatch?.displayName}
            </span>
          </Property>
        </MenuTrigger>
        <MenuContent align="start" className="max-h-80 overflow-y-auto">
          {projectSwatches.map((option) => (
            <MenuItem
              key={option.name}
              onSelect={() => attempt(patch(project.filePath, { swatch: option.name }, `Recolor “${project.title}”`))}
            >
              <span className="flex items-center gap-2">
                <ProjectDot color={option.hex} className="size-3" />
                {option.displayName}
              </span>
            </MenuItem>
          ))}
        </MenuContent>
      </Menu>
      <TagEditor item={project} />
      {project.todoProgress ? (
        <span className="px-2 text-sm text-text-tertiary">
          {project.todoProgress.done} of {project.todoProgress.total} done
        </span>
      ) : null}
    </PropertyRow>
  );
}

/** A project's page: name and properties, a free description, then its tasks and notes. */
export function ProjectHome({ project }: { project: ProjectWithStats }) {
  const navigate = useNavigate();
  const doc = useDocument(project.filePath);
  const isNew = useNewParam(project.filePath);
  const [showDone, setShowDone] = useState(false);
  const [findSlot, setFindSlot] = useState<HTMLDivElement | null>(null);
  const body = documentBody(doc);
  // File names follow titles (features/files); projects open by id, so the URL stays put.
  useRenameWithTitle(project, project.title, () => undefined, doc.saveNow);
  const notes = project.materials.filter((item) => item.type !== ArtifactType.INBOX);
  const tasks = showDone ? [...project.openTodos, ...project.doneTodos] : project.openTodos;
  const newNote = () => void createNote({ project: project.id }).then((url) => url && navigate(url));

  return (
    <PageLayout document>
      <PageTopBar
        leading={
          <Button variant="ghost" size="sm" leadingIcon={ArrowLeft} onClick={() => navigate(paths.projects)}>
            Projects
          </Button>
        }
        findSlot={setFindSlot}
      >
        <SaveState saving={doc.saving} dirty={doc.dirty} saved={doc.lastSaved !== null} />
        {/* Projects open by id, so a moved file keeps the same URL. */}
        <PageMenu item={project} flush={doc.saveNow} onDeleted={() => navigate(paths.projects)} onMoved={() => undefined} />
      </PageTopBar>

      {doc.conflict ? (
        <div className="mt-4">
          <ConflictBanner onLoadTheirs={doc.loadTheirs} onKeepMine={() => void doc.keepMine()} />
        </div>
      ) : null}

      <div className="mt-8 flex items-center gap-3">
        <ProjectDot color={projectColor(project)} className="size-4" />
        <ProjectTitle project={project} autoFocus={isNew} />
      </div>
      <div className="mt-3">
        <ProjectProperties project={project} />
      </div>

      <div className="mt-6">
        {doc.content !== null ? (
          <Editor
            value={body.value}
            onChange={body.onChange}
            artifact={{ id: project.id, filePath: project.filePath, type: project.type }}
            findSlot={findSlot}
            placeholder="What is this project about?"
          />
        ) : (
          <LoadingState rows={2} />
        )}
      </div>

      <section aria-label="Tasks" className="-mx-2 mt-8">
        <SectionHeader
          title="Tasks"
          count={project.openTodos.length}
          className="px-2"
          action={
            project.doneTodos.length > 0 ? (
              <Button variant="ghost" size="sm" leadingIcon={showDone ? EyeOff : Eye} onClick={() => setShowDone((shown) => !shown)}>
                {showDone ? 'Hide completed' : `Show completed (${project.doneTodos.length})`}
              </Button>
            ) : null
          }
        />
        <div role="list" className="flex flex-col">
          {tasks.map((task) => (
            <div role="listitem" key={task.filePath}>
              <TaskRow task={task} hideProject />
            </div>
          ))}
        </div>
        <AddTask project={project.id} />
      </section>

      <section aria-label="Notes" className="-mx-2 mt-10">
        <SectionHeader
          title="Notes"
          count={notes.length}
          className="px-2"
          action={
            <Button variant="ghost" size="sm" leadingIcon={Plus} onClick={newNote}>
              New note
            </Button>
          }
        />
        {notes.length === 0 ? (
          <p className="px-2 py-2 text-sm text-text-tertiary">Meeting notes, ideas, and references for this project live here.</p>
        ) : (
          notes.map((note) => (
            <ListRow
              key={note.filePath}
              onActivate={() => navigate(toNoteUrl(note.filePath))}
              leading={<Icon icon={FileText} className="text-text-tertiary" />}
              meta={[kindLabel(note.type), relativeTime(note.updated)].filter(Boolean).join(' · ')}
              className="px-2"
            >
              {note.title}
            </ListRow>
          ))
        )}
      </section>
    </PageLayout>
  );
}
