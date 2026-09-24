import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FolderKanban, Plus } from 'lucide-react';
import type { ProjectWithStats } from '../../data/projects';
import { useDataStatus, useProjects } from '../../data/selectors';
import { Button, EmptyState, LoadingState, PageHeader, SectionHeader } from '../../ui';
import { useCreate } from '../shell/useCreate';
import { ProjectCard } from './ProjectCard';
import { projectGroup, type ProjectGroup } from './projectStatus';

const byRecent = (a: ProjectWithStats, b: ProjectWithStats) =>
  (b.lastActivity ?? '').localeCompare(a.lastActivity ?? '') || a.title.localeCompare(b.title);

function CardGrid({ projects }: { projects: ProjectWithStats[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 px-2 lg:grid-cols-2">
      {projects.map((project) => (
        <ProjectCard key={project.filePath} project={project} />
      ))}
    </div>
  );
}

/** Every project as a card: active first, then someday, with finished ones folded away. */
export function ProjectIndex() {
  const projects = useProjects();
  const status = useDataStatus();
  const { newProject } = useCreate();
  const [showClosed, setShowClosed] = useState(false);

  const groups = useMemo(() => {
    const grouped: Record<ProjectGroup, ProjectWithStats[]> = { active: [], someday: [], closed: [] };
    for (const project of [...projects].sort(byRecent)) grouped[projectGroup(project.status)].push(project);
    return grouped;
  }, [projects]);

  return (
    <div className="h-full overflow-y-auto bg-canvas">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 pb-24 pt-12">
        <PageHeader
          title="Projects"
          subtitle={groups.active.length ? `${groups.active.length} active` : undefined}
          actions={
            <Button variant="primary" leadingIcon={Plus} onClick={newProject}>
              New project
            </Button>
          }
          className="px-2"
        />
        {status !== 'ready' ? (
          <LoadingState rows={4} />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet."
            description="A project gathers the tasks and notes for one goal."
            action={
              <Button variant="primary" leadingIcon={Plus} onClick={newProject}>
                New project
              </Button>
            }
          />
        ) : (
          <>
            {groups.active.length > 0 ? (
              <section aria-label="Active" className="flex flex-col gap-2">
                <SectionHeader title="Active" count={groups.active.length} className="px-2" />
                <CardGrid projects={groups.active} />
              </section>
            ) : null}
            {groups.someday.length > 0 ? (
              <section aria-label="Someday" className="flex flex-col gap-2">
                <SectionHeader title="Someday" count={groups.someday.length} className="px-2" />
                <CardGrid projects={groups.someday} />
              </section>
            ) : null}
            {groups.closed.length > 0 ? (
              <section aria-label="Completed" className="flex flex-col gap-2">
                <SectionHeader
                  title="Completed"
                  count={groups.closed.length}
                  className="px-2"
                  action={
                    <Button
                      variant="ghost"
                      size="sm"
                      leadingIcon={showClosed ? ChevronDown : ChevronRight}
                      aria-expanded={showClosed}
                      onClick={() => setShowClosed((shown) => !shown)}
                    >
                      {showClosed ? 'Hide' : 'Show'}
                    </Button>
                  }
                />
                {showClosed ? <CardGrid projects={groups.closed} /> : null}
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
