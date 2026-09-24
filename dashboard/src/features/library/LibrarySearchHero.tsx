import type { RefObject } from 'react';
import { Search } from 'lucide-react';
import type { ArtifactType } from '@shared/types';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { cn } from '../../lib/utils';
import { INDEX_TYPE_ORDER, type LibraryGrouping, type LibrarySort } from './libraryIndex';
import { LibrarySortMenu } from './LibrarySortMenu';
import type { SearchScope } from './librarySearch';

interface LibrarySearchHeroProps {
  query: string;
  scope: SearchScope;
  sort: LibrarySort;
  grouping: LibraryGrouping;
  chipCounts: Map<ArtifactType, number>;
  activeTypes: Set<ArtifactType>;
  inputRef: RefObject<HTMLInputElement>;
  onQueryChange: (query: string) => void;
  onScopeChange: (scope: SearchScope) => void;
  onSortChange: (sort: LibrarySort) => void;
  onGroupingChange: (grouping: LibraryGrouping) => void;
  onToggleType: (type: ArtifactType) => void;
}

/** The search hero: Literata query field with scope control and type filter chips. */
export function LibrarySearchHero({
  query,
  scope,
  sort,
  grouping,
  chipCounts,
  activeTypes,
  inputRef,
  onQueryChange,
  onScopeChange,
  onSortChange,
  onGroupingChange,
  onToggleType,
}: LibrarySearchHeroProps) {
  return (
    <>
      <div className="chronicle-library-search">
        <Search size={15} aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Search the library…"
          aria-label="Search the library"
          spellCheck={false}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            // Escape clears the query first, then releases focus so j/k take over.
            if (event.key === 'Escape') {
              event.preventDefault();
              if (query) onQueryChange('');
              else event.currentTarget.blur();
            }
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
        />
        <SegmentedControl
          aria-label="Search scope"
          value={scope}
          onChange={onScopeChange}
          options={[
            { value: 'full', label: 'Full text' },
            { value: 'titles', label: 'Titles' },
            { value: 'tags', label: 'Tags' },
          ]}
        />
      </div>
      <div className="chronicle-library-controls">
        <div className="chronicle-filter-chips" role="group" aria-label="Filter by type">
          {INDEX_TYPE_ORDER.filter(
            (type) => (chipCounts.get(type) ?? 0) > 0 || activeTypes.has(type),
          ).map((type) => {
            const count = chipCounts.get(type) ?? 0;
            const isActive = activeTypes.has(type);
            return (
              <button
                key={type}
                type="button"
                aria-pressed={isActive}
                disabled={count === 0 && !isActive}
                className={cn('chronicle-filter-chip', isActive && 'is-active')}
                onClick={() => onToggleType(type)}
              >
                {type.replace('-', ' ')}
                <span className="chronicle-chip-count">{count}</span>
              </button>
            );
          })}
        </div>
        <LibrarySortMenu
          sort={sort}
          grouping={grouping}
          onSortChange={onSortChange}
          onGroupingChange={onGroupingChange}
        />
      </div>
    </>
  );
}
