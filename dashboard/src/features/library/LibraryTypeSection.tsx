import type { Artifact } from '../../types/artifacts';
import { projectInkFor, SECTION_CAP, type IndexSection, type LibrarySort, type SectionId } from './libraryIndex';
import { LibraryIndexRow } from './LibraryIndexRow';

interface LibraryTypeSectionProps {
  section: IndexSection;
  highlightedId: string | null;
  projectInks: Map<string, string>;
  sort: LibrarySort;
  onOpen: (artifact: Artifact) => void;
  onToggleExpand: (id: SectionId) => void;
}

/** One type group: garnish heading with count, capped rows, view-all affordance. */
export function LibraryTypeSection({
  section,
  highlightedId,
  projectInks,
  sort,
  onOpen,
  onToggleExpand,
}: LibraryTypeSectionProps) {
  const headingId = `library-section-${section.id}`;
  const isExpanded = !section.capped && section.total > SECTION_CAP;

  return (
    <section aria-labelledby={headingId}>
      <div className="chronicle-list-heading chronicle-list-heading-row">
        <span id={headingId}>
          {section.label} · {section.total}
        </span>
        {section.capped || isExpanded ? (
          <button
            type="button"
            className="chronicle-heading-action active:scale-[0.98]"
            onClick={() => onToggleExpand(section.id)}
          >
            {section.capped ? `View all ${section.total} →` : 'Collapse'}
          </button>
        ) : null}
      </div>
      {section.rows.map(({ artifact, context }) => (
        <LibraryIndexRow
          key={artifact.id}
          artifact={artifact}
          context={context}
          dateField={sort}
          isHighlighted={highlightedId === artifact.id}
          projectInk={artifact.project ? projectInkFor(artifact.project, projectInks) : undefined}
          onOpen={onOpen}
        />
      ))}
    </section>
  );
}
