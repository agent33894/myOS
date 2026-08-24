import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { PROJECT_SORT_LABELS, type ProjectSort } from './projectGroups';

interface ProjectSortMenuProps {
  sort: ProjectSort;
  onSortChange: (sort: ProjectSort) => void;
}

/** Quiet mono control on the list heading, in the Library lens-menu grammar. */
export function ProjectSortMenu({ sort, onSortChange }: ProjectSortMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="chronicle-heading-action chronicle-lens-trigger"
          aria-label={`Sort projects, currently ${PROJECT_SORT_LABELS[sort]}`}
        >
          {PROJECT_SORT_LABELS[sort]}
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={sort}
          onValueChange={(value) => onSortChange(value as ProjectSort)}
        >
          {(Object.keys(PROJECT_SORT_LABELS) as ProjectSort[]).map((key) => (
            <DropdownMenuRadioItem key={key} value={key}>
              {PROJECT_SORT_LABELS[key]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
