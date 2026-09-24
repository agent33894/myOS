import { Link, useParams } from 'react-router-dom';
import { FolderX } from 'lucide-react';
import { paths } from '../../app/navigation';
import { useDataStatus, useProjects } from '../../data/selectors';
import { EmptyState, LoadingState, buttonVariants } from '../../ui';
import { ProjectHome } from './ProjectHome';
import { ProjectIndex } from './ProjectIndex';

/** `/projects` is every project; `/projects/:projectId` is that project's page. */
export default function ProjectsPage() {
  const { projectId } = useParams();
  const projects = useProjects();
  const status = useDataStatus();
  if (!projectId) return <ProjectIndex />;

  const project = projects.find((candidate) => candidate.id === projectId);
  if (project) return <ProjectHome key={project.filePath} project={project} />;
  if (status !== 'ready') return <LoadingState className="p-12" />;
  return (
    <div className="grid h-full place-items-center bg-canvas">
      <EmptyState
        icon={FolderX}
        title="This project no longer exists."
        action={
          <Link to={paths.projects} className={buttonVariants()}>
            All projects
          </Link>
        }
      />
    </div>
  );
}
