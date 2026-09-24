import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  LIBRARY_GROUPING_LABELS,
  LIBRARY_SORT_LABELS,
  type LibraryGrouping,
  type LibrarySort,
} from './libraryIndex';

interface LibrarySortMenuProps {
  sort: LibrarySort;
  grouping: LibraryGrouping;
  onSortChange: (sort: LibrarySort) => void;
  onGroupingChange: (grouping: LibraryGrouping) => void;
}

/** View lens for the Library index: date order and optional type grouping. Newest always first. */
export function LibrarySortMenu({ sort, grouping, onSortChange, onGroupingChange }: LibrarySortMenuProps) {
  const summary = grouping === 'type' ? `${LIBRARY_SORT_LABELS[sort]} · by type` : LIBRARY_SORT_LABELS[sort];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="chronicle-heading-action chronicle-lens-trigger chronicle-library-sort-trigger"
          aria-label={`Library view, currently ${summary}`}
        >
          {summary}
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Order</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={sort} onValueChange={(value) => onSortChange(value as LibrarySort)}>
          {(Object.keys(LIBRARY_SORT_LABELS) as LibrarySort[]).map((key) => (
            <DropdownMenuRadioItem key={key} value={key}>
              {LIBRARY_SORT_LABELS[key]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Grouping</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={grouping}
          onValueChange={(value) => onGroupingChange(value as LibraryGrouping)}
        >
          {(Object.keys(LIBRARY_GROUPING_LABELS) as LibraryGrouping[]).map((key) => (
            <DropdownMenuRadioItem key={key} value={key}>
              {LIBRARY_GROUPING_LABELS[key]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
