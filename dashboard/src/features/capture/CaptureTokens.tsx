import { AlertCircle, CalendarDays, Flag, FolderPlus, Hash, Repeat, Timer } from 'lucide-react';
import { Button, Pill, cn } from '../../ui';
import { ProjectDot } from '../tasks/ProjectDot';
import type { CaptureToken } from './resolveCapture';

interface CaptureTokensProps {
  tokens: CaptureToken[];
  /** Create the project an unknown `@name` names, then file the capture there. */
  onCreateProject?: (name: string) => void;
  className?: string;
}

/** What the capture syntax picked up, as quiet pills. An unknown `@name` offers to create that project. */
export function CaptureTokens({ tokens, onCreateProject, className }: CaptureTokensProps) {
  if (tokens.length === 0) return null;
  return (
    <div aria-label="Details found" className={cn('flex flex-wrap items-center gap-1.5 animate-fade-in', className)}>
      {tokens.map((token) => {
        switch (token.kind) {
          case 'date':
            return <Pill key="date" tone="accent" icon={CalendarDays}>{token.label}</Pill>;
          case 'repeat':
            return <Pill key="repeat" tone="accent" icon={Repeat}>{token.label}</Pill>;
          case 'estimate':
            return <Pill key="estimate" icon={Timer}>{token.label}</Pill>;
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
            return onCreateProject ? (
              <Button
                key="new-project"
                size="sm"
                variant="secondary"
                leadingIcon={FolderPlus}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onCreateProject(token.name)}
                className="h-6 rounded-full"
              >
                {token.label}
              </Button>
            ) : null;
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
