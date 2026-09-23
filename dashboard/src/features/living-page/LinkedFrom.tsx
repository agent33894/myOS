import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Artifact } from '../../types/artifacts';
import { useArtifactsStore } from '../../store/artifacts';
import { findBacklinks } from '../../utils/artifactLinks';
import { getTypeLabel } from '../../utils/typeIcons';
import { toArtifactNavigationUrl } from '../artifact-route/routeContract';

/** Everything that points here — `[[wiki links]]` and `related` entries. */
export default function LinkedFrom({ artifact }: { artifact: Artifact }) {
  const navigate = useNavigate();
  const artifacts = useArtifactsStore((state) => state.artifacts);
  const backlinks = useMemo(() => findBacklinks(artifact, artifacts), [artifact, artifacts]);
  if (backlinks.length === 0) return null;

  return (
    <section className="chronicle-backlinks" aria-labelledby={`linked-from-${artifact.id}`}>
      <h2 id={`linked-from-${artifact.id}`}>Linked from · {backlinks.length}</h2>
      <ul>
        {backlinks.map((linked) => (
          <li key={linked.filePath}>
            <button type="button" onClick={() => navigate(toArtifactNavigationUrl(linked))}>
              <span>{linked.title}</span>
              <small>{getTypeLabel(linked.type)}</small>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
