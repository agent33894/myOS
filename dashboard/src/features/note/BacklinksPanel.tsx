import { Link2 } from 'lucide-react';
import { useMemo } from 'react';
import type { PanelProps } from '../../app/panels';
import { openNote } from '../../app/navigation';
import { useNote, useNotes } from '../../data/selectors';
import { findBacklinks } from '../../lib/links';
import { Button, EmptyState } from '../../ui';

/** Notes that link to the open one, with `[[…]]` or a relative link. */
export function BacklinksPanel({ path }: PanelProps) {
  const note = useNote(path);
  const notes = useNotes();
  const linked = useMemo(() => (note ? findBacklinks(note, notes) : []), [note, notes]);
  if (linked.length === 0) return <EmptyState icon={Link2} title="No backlinks" description="Notes that link here show up in this list." />;
  return (
    <ul className="flex flex-col py-2">
      {linked.map((item) => (
        <li key={item.path}>
          <Button variant="ghost" size="sm" className="w-full justify-start truncate" onClick={() => openNote(item.path)}>
            {item.title}
          </Button>
        </li>
      ))}
    </ul>
  );
}
