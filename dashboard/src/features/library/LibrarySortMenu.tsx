import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { LIBRARY_SORT_LABELS, type LibrarySort } from './libraryIndex';

interface LibrarySortMenuProps {
  sort: LibrarySort;
  onSortChange: (sort: LibrarySort) => void;
}

/** Date lens for the Library index. Newest artifacts are always shown first. */
export function LibrarySortMenu({ sort, onSortChange }: LibrarySortMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="chronicle-heading-action chronicle-lens-trigger chronicle-library-sort-trigger"
          aria-label={`Sort library, currently ${LIBRARY_SORT_LABELS[sort]}`}
        >
          {LIBRARY_SORT_LABELS[sort]}
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={sort}
          onValueChange={(value) => onSortChange(value as LibrarySort)}
        >
          {(Object.keys(LIBRARY_SORT_LABELS) as LibrarySort[]).map((key) => (
            <DropdownMenuRadioItem key={key} value={key}>
              {LIBRARY_SORT_LABELS[key]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
