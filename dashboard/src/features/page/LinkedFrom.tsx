import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ArtifactSummary } from '@shared/types';
import { toItemUrl } from '../../app/navigation';
import { useArtifacts } from '../../data/selectors';
import { Icon, ListRow, SectionHeader } from '../../ui';
import { findBacklinks } from '../../utils/artifactLinks';
import { itemIcon } from './kinds';

/** Pages that point here with `[[links]]` or `related`. */
export function LinkedFrom({ item }: { item: ArtifactSummary }) {
  const navigate = useNavigate();
  const artifacts = useArtifacts();
  const backlinks = useMemo(() => findBacklinks(item, artifacts), [item, artifacts]);
  if (backlinks.length === 0) return null;

  return (
    <section aria-label="Linked from" className="-mx-2 mt-16">
      <SectionHeader title="Linked from" count={backlinks.length} as="h3" className="px-2" />
      {backlinks.map((linked) => (
        <ListRow
          key={linked.filePath}
          onActivate={() => navigate(toItemUrl(linked))}
          leading={<Icon icon={itemIcon(linked.type)} className="text-text-tertiary" />}
          className="px-2 text-text-secondary"
        >
          {linked.title}
        </ListRow>
      ))}
    </section>
  );
}
