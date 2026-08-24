import { Navigate, useSearchParams } from 'react-router-dom';
import { toLegacyArtifactRedirectUrl } from './routeContract';

export default function LegacyArtifactRedirect() {
  const [searchParams] = useSearchParams();
  return <Navigate replace to={toLegacyArtifactRedirectUrl(searchParams)} />;
}
