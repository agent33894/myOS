import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ArtifactType } from '@shared/types';
import { paths, toPageUrl, toProjectUrl, toSettingsUrl } from '../../app/navigation';
import { useArtifact } from '../../data/selectors';
import { Button, IconButton } from '../../ui';
import { ProjectDot } from '../tasks/ProjectDot';
import { useProjectRefs } from '../tasks/projectRefs';
import { Page } from './Page';

/** Where "up" is for an item: its project, else the place it lives. */
function useBreadcrumb(path: string) {
  const item = useArtifact(path);
  const project = useProjectRefs().find(item?.project);
  if (project) return { label: project.title, href: toProjectUrl(project.id), color: project.color };
  if (item?.type === ArtifactType.INBOX) return { label: 'Inbox', href: paths.inbox };
  if (item?.type === ArtifactType.JOURNAL) return { label: 'Journal', href: paths.journal };
  // Templates are managed in Settings; they never appear in Notes.
  if (item?.type === ArtifactType.TEMPLATE) return { label: 'Templates', href: toSettingsUrl() };
  if (item && item.type !== ArtifactType.TODO) return { label: 'Notes', href: paths.notes };
  return null;
}

/** `/page?path=…`: any item as a full-width page. */
export default function PageRoute() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const path = params.get('path');
  const item = useArtifact(path);
  const crumb = useBreadcrumb(path ?? '');

  if (!path) return <Navigate to={paths.today} replace />;
  if (item?.type === ArtifactType.PROJECT) return <Navigate to={toProjectUrl(item.id)} replace />;

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate(paths.today));
  return (
    <Page
      key={path}
      path={path}
      onDeleted={back}
      onMoved={(moved) => navigate(toPageUrl(moved), { replace: true })}
      missingAction={<Button onClick={back}>Go back</Button>}
      leading={
        <>
          <IconButton icon={ArrowLeft} label="Back" size="sm" onClick={back} />
          {crumb ? (
            <Button variant="ghost" size="sm" onClick={() => navigate(crumb.href)} className="min-w-0">
              {crumb.color ? <ProjectDot color={crumb.color} /> : null}
              <span className="truncate">{crumb.label}</span>
            </Button>
          ) : null}
        </>
      }
    />
  );
}
