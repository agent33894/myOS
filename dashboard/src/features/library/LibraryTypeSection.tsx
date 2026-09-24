import type { ArtifactSummary } from '@shared/types';
import { projectInkFor, SECTION_CAP, type IndexSection, type LibrarySort, type SectionId } from './libraryIndex';
import { LibraryIndexRow } from './LibraryIndexRow';

interface LibraryTypeSectionProps {
  section: IndexSection;
  highlightedId: string | null;
  projectInks: Map<string, string>;
  sort: LibrarySort;
  /** Label each row with its type when sections no longer imply it. */
  showType: boolean;
  onOpen: (artifact: ArtifactSummary) => void;
  onToggleExpand: (id: SectionId) => void;
}

/** One index section: garnish heading with count, rows, and a view-all affordance when capped. */
export function LibraryTypeSection({
  section,
  highlightedId,
  projectInks,
  sort,
  showType,
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
          showType={showType}
          isHighlighted={highlightedId === artifact.id}
          projectInk={artifact.project ? projectInkFor(artifact.project, projectInks) : undefined}
          onOpen={onOpen}
        />
      ))}
    </section>
  );
}
