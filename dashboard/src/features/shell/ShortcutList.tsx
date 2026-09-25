import { cn, Kbd } from '../../ui';
import { SHORTCUT_GROUPS } from './shortcuts';

/** Every shortcut, grouped in two columns: the `?` sheet and Settings → Keyboard. */
export function ShortcutList({ className }: { className?: string }) {
  return (
    <div className={cn('grid gap-x-10 gap-y-6 sm:grid-cols-2', className)}>
      {SHORTCUT_GROUPS.map((group) => (
        <section key={group.title} aria-label={group.title} className="flex flex-col">
          <h3 className="pb-1 text-sm font-medium text-text-secondary">{group.title}</h3>
          {group.items.map((item) => (
            <div key={item.label} className="flex h-8 items-center justify-between gap-4 text-base text-text">
              <span>{item.label}</span>
              <span className="flex shrink-0 items-center gap-1">
                {(Array.isArray(item.keys) ? item.keys : [item.keys]).map((keys) => (
                  <Kbd key={keys} shortcut={keys} />
                ))}
              </span>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
