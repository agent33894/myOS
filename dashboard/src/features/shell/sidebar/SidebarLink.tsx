import { forwardRef, type AnchorHTMLAttributes, type ReactElement, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Tooltip, cn } from '../../../ui';

interface SidebarLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  label: string;
  /** Icon or color dot. */
  leading: ReactNode;
  /** Count or hover action, shown only in the wide sidebar. */
  trailing?: ReactNode;
  active: boolean;
  /** Icon rail: no label, tooltip instead. */
  rail: boolean;
  /** Tooltip text in the rail (defaults to the label). */
  hint?: string;
  shortcut?: string;
  /** A small dot on the rail icon, for a section with something waiting. */
  badge?: boolean;
  /** Wraps the link in another trigger (a context menu) inside the rail tooltip. */
  wrap?: (link: ReactElement) => ReactElement;
}

/** One sidebar row: a section or a project. */
export const SidebarLink = forwardRef<HTMLAnchorElement, SidebarLinkProps>(function SidebarLink(
  { to, label, leading, trailing, active, rail, hint, shortcut, badge = false, wrap = (link) => link, className, ...props },
  ref,
) {
  const link = (
    <Link
      ref={ref}
      to={to}
      aria-label={rail ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group/row relative flex h-8 min-w-0 items-center gap-3 rounded-md text-base outline-offset-0 transition-colors duration-fast ease-out',
        rail ? 'mx-auto w-9 justify-center' : 'px-2',
        active ? 'bg-raised font-medium text-text shadow-raised' : 'text-text-secondary hover:bg-text/5 hover:text-text',
        className,
      )}
      {...props}
    >
      <span className={cn('flex size-4 shrink-0 items-center justify-center', active && 'text-accent-text')}>{leading}</span>
      {rail ? null : <span className="min-w-0 flex-1 truncate">{label}</span>}
      {rail ? null : trailing}
      {rail && badge ? (
        <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent" />
      ) : null}
    </Link>
  );
  if (!rail) return wrap(link);
  return (
    <Tooltip content={hint ?? label} shortcut={shortcut} side="right">
      {wrap(link)}
    </Tooltip>
  );
});
