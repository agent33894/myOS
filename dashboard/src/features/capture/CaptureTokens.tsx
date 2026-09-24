import { AlertCircle, CalendarDays, Flag, Hash, HelpCircle } from 'lucide-react';
import { Pill, cn } from '../../ui';
import { ProjectDot } from '../tasks/ProjectDot';
import type { CaptureToken } from './resolveCapture';

/** What the capture syntax picked up, as quiet pills. */
export function CaptureTokens({ tokens, className }: { tokens: CaptureToken[]; className?: string }) {
  if (tokens.length === 0) return null;
  return (
    <div aria-label="Details found" className={cn('flex flex-wrap items-center gap-1.5 animate-fade-in', className)}>
      {tokens.map((token) => {
        switch (token.kind) {
          case 'date':
            return <Pill key="date" tone="accent" icon={CalendarDays}>{token.label}</Pill>;
          case 'project':
            return (
              <Pill key="project">
                <span className="flex items-center gap-1.5">
                  <ProjectDot color={token.color} />
                  {token.label}
                </span>
              </Pill>
            );
          case 'new-project':
            return <Pill key="new-project" icon={HelpCircle}>{token.label}</Pill>;
          case 'flag':
            return <Pill key="flag" tone="warning" icon={Flag}>{token.label}</Pill>;
          case 'priority':
            return <Pill key="priority" tone="warning" icon={AlertCircle}>{token.label}</Pill>;
          case 'tag':
            return <Pill key={token.label} icon={Hash}>{token.label.slice(1)}</Pill>;
        }
      })}
    </div>
  );
}
