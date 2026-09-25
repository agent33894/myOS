import { STATUS_ITEMS } from '../../app/statusbar';
import { useActivePath } from '../../store/ui';

/** The file on screen, as its path in the folder. */
function PathItem() {
  const path = useActivePath();
  return path ? <span className="min-w-0 truncate">{path}</span> : null;
}

/** The bottom line, in monospace: the file's path, then the items registered in app/statusbar.ts. */
export function StatusBar() {
  const side = (which: 'left' | 'right') =>
    STATUS_ITEMS.filter((item) => item.side === which).map(({ id, component: Item }) => <Item key={id} />);
  return (
    <footer className="flex h-8 shrink-0 items-center gap-5 px-4 font-mono text-xs text-text-tertiary">
      {side('left')}
      <PathItem />
      <span className="flex-1" />
      {side('right')}
    </footer>
  );
}
