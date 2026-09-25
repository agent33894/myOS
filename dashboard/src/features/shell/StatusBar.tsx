import { STATUS_ITEMS } from '../../app/statusbar';

/** The bottom line, in monospace: items registered in app/statusbar.ts. */
export function StatusBar() {
  const side = (which: 'left' | 'right') =>
    STATUS_ITEMS.filter((item) => item.side === which).map(({ id, component: Item }) => <Item key={id} />);
  return (
    <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-border px-3 font-mono text-xs text-text-tertiary">
      {side('left')}
      <span className="flex-1" />
      {side('right')}
    </footer>
  );
}
