import { SlidersHorizontal } from 'lucide-react';
import type { PanelProps } from '../../app/panels';
import { useNote } from '../../data/selectors';
import { EmptyState } from '../../ui';

const show = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value));

/** The note's frontmatter, key by key. (Wave B: editing.) */
export function PropertiesPanel({ path }: PanelProps) {
  const note = useNote(path);
  const entries = Object.entries(note?.properties ?? {});
  if (note?.propertiesError) return <EmptyState icon={SlidersHorizontal} title="Properties can’t be read" description={note.propertiesError} />;
  if (entries.length === 0) return <EmptyState icon={SlidersHorizontal} title="No properties" description="Frontmatter at the top of a note shows up here." />;
  return (
    <dl className="flex flex-col gap-2 py-2 text-sm">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-col">
          <dt className="font-mono text-xs text-text-tertiary">{key}</dt>
          <dd className="break-words text-text">{show(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
