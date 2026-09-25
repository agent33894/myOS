import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Hash } from 'lucide-react';
import { ArtifactType, TodoStatus, type ArtifactSummary } from '@shared/types';
import { paths, toItemUrl, toTagUrl } from '../../app/navigation';
import { useArtifacts, useDataStatus } from '../../data/selectors';
import { Button, EmptyState, Icon, ListRow, LoadingState, PageHeader, PageLayout, Pill, SectionHeader } from '../../ui';
import { itemIcon, kindLabel } from '../../lib/itemKinds';
import { snippet } from '../notes/noteSearch';
import { relativeTime } from '../tasks/dates';
import { ProjectDot } from '../tasks/ProjectDot';
import { projectColor, useProjectRefs } from '../tasks/projectRefs';
import { TaskRow } from '../tasks/TaskRow';
import { tagCounts } from './useTags';

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
const NOT_NOTES = new Set<string>([ArtifactType.TODO, ArtifactType.PROJECT, ArtifactType.INBOX, ArtifactType.TEMPLATE]);

function NoteLine({ note }: { note: ArtifactSummary }) {
  const navigate = useNavigate();
  const project = useProjectRefs().find(note.project);
  const preview = snippet(note.searchText, '', note.title);
  const kind = note.type === ArtifactType.JOURNAL ? 'Journal' : kindLabel(note.type);
  return (
    <div
      role="listitem"
      tabIndex={0}
      onClick={() => navigate(toItemUrl(note))}
      onKeyDown={(event) => event.key === 'Enter' && navigate(toItemUrl(note))}
      className="flex cursor-default gap-3 rounded-md px-2 py-2 outline-none transition-colors duration-fast hover:bg-text/5 focus-visible:ring-2 focus-visible:ring-focus"
    >
      <Icon icon={itemIcon(note.type)} className="mt-0.5 shrink-0 text-text-tertiary" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-base font-medium text-text">{note.title || 'Untitled'}</span>
          <span className="shrink-0 text-xs text-text-tertiary">{relativeTime(note.updated)}</span>
        </div>
        <div className="flex min-w-0 items-center gap-1.5 text-sm text-text-tertiary">
          {project ? <ProjectDot color={project.color} /> : null}
          {kind ? <span className="shrink-0 text-text-secondary">{kind}</span> : null}
          {kind && preview ? <span aria-hidden="true">·</span> : null}
          <span className="truncate">{preview}</span>
        </div>
      </div>
    </div>
  );
}

/** One tag: its tasks, notes, and projects, and the tags it often travels with. */
export default function TagPage() {
  const tag = decodeURIComponent(useParams().tag ?? '').toLowerCase();
  const artifacts = useArtifacts();
  const status = useDataStatus();
  const navigate = useNavigate();
  const [showDone, setShowDone] = useState(false);

  const { open, done, notes, projects, related } = useMemo(() => {
    const tagged = artifacts.filter((item) => item.tags.includes(tag) && item.type !== ArtifactType.TEMPLATE);
    const byEdit = (a: ArtifactSummary, b: ArtifactSummary) => b.updated.localeCompare(a.updated);
    const tasks = tagged.filter((item) => item.type === ArtifactType.TODO);
    const closed = new Set<string>([TodoStatus.DONE, TodoStatus.CANCELLED]);
    return {
      open: tasks.filter((task) => !closed.has(task.status)).sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || byEdit(a, b)),
      done: tasks.filter((task) => closed.has(task.status)).sort(byEdit),
      notes: tagged.filter((item) => !NOT_NOTES.has(item.type)).sort(byEdit),
      projects: tagged.filter((item) => item.type === ArtifactType.PROJECT).sort(byEdit),
      related: tagCounts(tagged)
        .filter((entry) => entry.tag !== tag)
        .slice(0, 8),
    };
  }, [artifacts, tag]);

  const taskCount = open.length + done.length;
  const summary = [
    notes.length ? plural(notes.length, 'note') : '',
    taskCount ? plural(taskCount, 'task') : '',
    projects.length ? plural(projects.length, 'project') : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const empty = taskCount + notes.length + projects.length === 0;

  return (
    <PageLayout className="gap-8">
      <PageHeader
        className="px-2"
        title={
          <span className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-md bg-accent-soft text-accent-text">
              <Icon icon={Hash} />
            </span>
            {tag}
          </span>
        }
        subtitle={status === 'ready' && !empty ? summary : undefined}
      />

      {status !== 'ready' ? (
        <LoadingState rows={5} />
      ) : empty ? (
        <EmptyState
          icon={Hash}
          title={`Nothing is tagged #${tag} right now.`}
          description="Add the tag to a note or task, or type it in Quick Capture."
          action={<Button onClick={() => navigate(paths.notes)}>Go to notes</Button>}
        />
      ) : (
        <>
          {related.length > 0 ? (
            <div className="-mt-4 flex flex-wrap items-center gap-1.5 px-2">
              <span className="mr-1 text-sm text-text-tertiary">Often with</span>
              {related.map((entry) => (
                <Pill key={entry.tag}>
                  <Link to={toTagUrl(entry.tag)} className="rounded-sm outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-focus">
                    #{entry.tag}
                  </Link>
                </Pill>
              ))}
            </div>
          ) : null}

          {taskCount > 0 ? (
            <section aria-label="Tasks">
              <SectionHeader
                title="Tasks"
                count={open.length}
                className="px-2"
                action={
                  done.length > 0 ? (
                    <Button size="sm" variant="ghost" onClick={() => setShowDone((shown) => !shown)}>
                      {showDone ? 'Hide done' : `Show ${done.length} done`}
                    </Button>
                  ) : undefined
                }
              />
              <div role="list" className="flex flex-col">
                {(showDone ? [...open, ...done] : open).map((task) => (
                  <div role="listitem" key={task.filePath}>
                    <TaskRow task={task} />
                  </div>
                ))}
              </div>
              {open.length === 0 && !showDone ? <p className="px-2 py-2 text-sm text-text-tertiary">Every task here is done.</p> : null}
            </section>
          ) : null}

          {notes.length > 0 ? (
            <section aria-label="Notes">
              <SectionHeader title="Notes" count={notes.length} className="px-2" />
              <div role="list" className="flex flex-col gap-0.5">
                {notes.map((note) => (
                  <NoteLine key={note.filePath} note={note} />
                ))}
              </div>
            </section>
          ) : null}

          {projects.length > 0 ? (
            <section aria-label="Projects">
              <SectionHeader title="Projects" count={projects.length} className="px-2" />
              {projects.map((project) => (
                <ListRow
                  key={project.filePath}
                  onActivate={() => navigate(toItemUrl(project))}
                  leading={<ProjectDot color={projectColor(project)} />}
                  meta={relativeTime(project.updated)}
                  className="px-2"
                >
                  {project.title}
                </ListRow>
              ))}
            </section>
          ) : null}
        </>
      )}
    </PageLayout>
  );
}
