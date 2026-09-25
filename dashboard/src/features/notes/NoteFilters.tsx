import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Hash, X } from 'lucide-react';
import { AREAS } from '@shared/spec';
import { ArtifactType, type ArtifactSummary, type Domain } from '@shared/types';
import { toTagUrl } from '../../app/navigation';
import {
  Button,
  Icon,
  IconButton,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuLabel,
  MenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '../../ui';
import { kindLabel } from '../../lib/itemKinds';
import { ProjectDot } from '../tasks/ProjectDot';
import { useProjectRefs } from '../tasks/projectRefs';
import { tagCounts, useTags } from '../tags/useTags';

export type NoteKind = ArtifactType | 'note';

export interface NoteFilter {
  project?: string;
  tag?: string;
  area?: Domain;
  kind?: NoteKind;
}

/** Plain notes (memos and untyped Markdown) are one kind; older typed files keep theirs. */
const kindOf = (note: ArtifactSummary): NoteKind => (kindLabel(note.type) || note.type === ArtifactType.JOURNAL ? note.type : 'note');
const kindName = (kind: NoteKind) => (kind === 'note' ? 'Notes' : kind === ArtifactType.JOURNAL ? 'Journal' : (kindLabel(kind) ?? kind));

/** The notes that pass every chosen filter. */
export function applyNoteFilter(notes: readonly ArtifactSummary[], filter: NoteFilter): ArtifactSummary[] {
  return notes.filter(
    (note) =>
      (!filter.project || note.project === filter.project) &&
      (!filter.tag || note.tags.includes(filter.tag)) &&
      (!filter.area || note.domain === filter.area) &&
      (!filter.kind || kindOf(note) === filter.kind),
  );
}

interface ChipProps {
  label: string;
  value?: ReactNode;
  onClear: () => void;
  children: ReactNode;
}

/** A filter chip: its name at rest, its value (with a way to clear it) when set. */
function Chip({ label, value, onClear, children }: ChipProps) {
  const active = value !== undefined;
  return (
    <span className={cn('inline-flex h-7 items-center rounded-full transition-colors duration-fast', active ? 'bg-accent-soft text-accent-text' : 'text-text-secondary')}>
      <Menu>
        <MenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            aria-label={active ? `${label}: filtering` : `Filter by ${label.toLowerCase()}`}
            className={cn('h-7 gap-0.5 rounded-full px-2 font-normal', active && 'pr-1 text-accent-text hover:bg-transparent hover:text-accent-text')}
          >
            <span className="max-w-32 truncate">{active ? value : label}</span>
            {active ? null : <Icon icon={ChevronDown} size="sm" className="text-text-tertiary" />}
          </Button>
        </MenuTrigger>
        <MenuContent align="start" className="max-h-80 overflow-y-auto">
          {children}
        </MenuContent>
      </Menu>
      {active ? <IconButton icon={X} label={`Clear ${label.toLowerCase()} filter`} size="sm" onClick={onClear} className="mr-0.5 size-6 rounded-full text-accent-text hover:bg-accent/10" /> : null}
    </span>
  );
}

interface NoteFiltersProps {
  /** Every note the filters can choose from, journal pages included. */
  notes: readonly ArtifactSummary[];
  filter: NoteFilter;
  onChange: (filter: NoteFilter) => void;
}

/** Project, Tag, Area, and Kind chips under the Notes search. */
export function NoteFilters({ notes, filter, onChange }: NoteFiltersProps) {
  const projects = useProjectRefs();
  const set = (patch: Partial<NoteFilter>) => onChange({ ...filter, ...patch });

  const options = useMemo(() => {
    const projectIds = new Set(notes.flatMap((note) => (note.project ? [note.project] : [])));
    const areas = new Set(notes.flatMap((note) => (note.domain ? [note.domain] : [])));
    const kinds = new Set(notes.map(kindOf));
    return {
      projects: projects.all.filter((project) => projectIds.has(project.id) || projectIds.has(project.title)),
      tags: tagCounts(notes),
      areas: (Object.keys(AREAS) as Domain[]).filter((area) => areas.has(area)),
      kinds: (['note', ...Object.values(ArtifactType)] as NoteKind[]).filter((kind) => kinds.has(kind)),
    };
  }, [notes, projects]);

  const project = filter.project ? projects.find(filter.project) : undefined;

  return (
    <div role="group" aria-label="Filters" className="-ml-1 flex flex-wrap items-center gap-0.5">
      <Chip label="Project" value={filter.project ? (project?.title ?? filter.project) : undefined} onClear={() => set({ project: undefined })}>
        {options.projects.length === 0 ? <MenuLabel>No notes are in a project yet</MenuLabel> : null}
        {options.projects.map((option) => (
          <MenuCheckboxItem key={option.id} checked={filter.project === option.id} onCheckedChange={(on) => set({ project: on ? option.id : undefined })}>
            <span className="flex items-center gap-2">
              <ProjectDot color={option.color} />
              {option.title}
            </span>
          </MenuCheckboxItem>
        ))}
      </Chip>
      <Chip label="Tag" value={filter.tag ? `#${filter.tag}` : undefined} onClear={() => set({ tag: undefined })}>
        {options.tags.length === 0 ? <MenuLabel>No tags on notes yet</MenuLabel> : null}
        {options.tags.map(({ tag, count }) => (
          <MenuCheckboxItem key={tag} checked={filter.tag === tag} onCheckedChange={(on) => set({ tag: on ? tag : undefined })}>
            <span className="flex items-center gap-2">
              #{tag}
              <span className="text-text-tertiary">{count}</span>
            </span>
          </MenuCheckboxItem>
        ))}
      </Chip>
      <Chip label="Area" value={filter.area ? AREAS[filter.area] : undefined} onClear={() => set({ area: undefined })}>
        {options.areas.map((area) => (
          <MenuCheckboxItem key={area} checked={filter.area === area} onCheckedChange={(on) => set({ area: on ? area : undefined })}>
            {AREAS[area]}
          </MenuCheckboxItem>
        ))}
      </Chip>
      <Chip label="Kind" value={filter.kind ? kindName(filter.kind) : undefined} onClear={() => set({ kind: undefined })}>
        {options.kinds.map((kind) => (
          <MenuCheckboxItem key={kind} checked={filter.kind === kind} onCheckedChange={(on) => set({ kind: on ? kind : undefined })}>
            {kindName(kind)}
          </MenuCheckboxItem>
        ))}
      </Chip>
    </div>
  );
}

/** Every tag in use, most used first; each opens its tag page. */
export function TagsList() {
  const navigate = useNavigate();
  const tags = useTags();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton icon={Hash} label="Tags" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1">
        <div className="px-2 pb-1 pt-2 text-xs font-medium text-text-secondary">Tags</div>
        {tags.length === 0 ? (
          <p className="px-2 pb-3 pt-1 text-sm text-text-tertiary">No tags yet. Add one to any note or task with #.</p>
        ) : (
          <div className="flex max-h-80 flex-col overflow-y-auto">
            {tags.map(({ tag, count }) => (
              <MenuLikeRow key={tag} onSelect={() => navigate(toTagUrl(tag))}>
                <Icon icon={Hash} className="text-text-tertiary" />
                <span className="min-w-0 flex-1 truncate">{tag}</span>
                <span className="text-xs tabular-nums text-text-tertiary">{count}</span>
              </MenuLikeRow>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function MenuLikeRow({ onSelect, children }: { onSelect: () => void; children: ReactNode }) {
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => event.key === 'Enter' && onSelect()}
      className="flex h-8 cursor-default items-center gap-2 rounded-md px-2 text-base text-text outline-none transition-colors duration-fast hover:bg-text/5 focus-visible:bg-text/5"
    >
      {children}
    </div>
  );
}
