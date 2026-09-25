import { ListTree } from 'lucide-react';
import type { PanelProps } from '../../app/panels';
import { useDataStore } from '../../data/store';
import { EmptyState } from '../../ui';

/** Headings in the note, outside code blocks. */
function headings(markdown: string): Array<{ level: number; text: string }> {
  let fenced = false;
  return markdown.split('\n').flatMap((line) => {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const match = fenced ? null : /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
    return match ? [{ level: match[1].length, text: match[2] }] : [];
  });
}

/** The note's headings. (Wave B: jump to a heading on click.) */
export function OutlinePanel({ path }: PanelProps) {
  const text = useDataStore((state) => (path ? (state.bodies[path]?.content ?? state.notes[path]?.searchText ?? '') : ''));
  const items = headings(text);
  if (!path || items.length === 0) return <EmptyState icon={ListTree} title="No headings" description="Headings in the open note show up here." />;
  return (
    <ul className="flex flex-col gap-1 py-2 text-sm text-text-secondary">
      {items.map((item, index) => (
        <li key={index} className="truncate" style={{ paddingLeft: `${(item.level - 1) * 12}px` }}>
          {item.text}
        </li>
      ))}
    </ul>
  );
}
