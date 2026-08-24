import { memo } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, LucideIcon } from 'lucide-react';
import { parseMarkdownCalloutBlock, type MarkdownCalloutTone } from '../../utils/richBlocks';

interface MarkdownCalloutBlockProps {
  raw: string;
}

function CalloutErrorFallback({ message, raw }: { message: string; raw: string }) {
  return (
    <div className="my-5 border border-[hsl(var(--ed-warning))]/45 bg-card">
      <div className="flex items-center gap-2 border-b border-[hsl(var(--ed-warning))]/35 px-3 py-2 bg-[hsl(var(--ed-warning))]/8">
        <AlertTriangle className="h-4 w-4 text-[hsl(var(--ed-warning))]" />
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--ed-warning))]">
          Callout Block Warning
        </p>
      </div>
      <div className="px-3 py-3">
        <p className="mb-3 text-sm text-foreground">{message}</p>
        <pre className="overflow-x-auto border border-border/60 bg-secondary/50 p-3 text-xs">
          <code>{raw}</code>
        </pre>
      </div>
    </div>
  );
}

function getToneTokens(tone: MarkdownCalloutTone): {
  icon: LucideIcon;
  border: string;
  bg: string;
  text: string;
} {
  switch (tone) {
    case 'success':
      return {
        icon: CheckCircle2,
        border: 'border-[hsl(var(--ed-success))/0.45]',
        bg: 'bg-[hsl(var(--ed-success))/0.08]',
        text: 'text-[hsl(var(--ed-success))]',
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        border: 'border-[hsl(var(--ed-warning))/0.45]',
        bg: 'bg-[hsl(var(--ed-warning))/0.08]',
        text: 'text-[hsl(var(--ed-warning))]',
      };
    case 'error':
      return {
        icon: AlertCircle,
        border: 'border-[hsl(var(--ed-error))/0.45]',
        bg: 'bg-[hsl(var(--ed-error))/0.08]',
        text: 'text-[hsl(var(--ed-error))]',
      };
    case 'neutral':
      return {
        icon: Info,
        border: 'border-border/60',
        bg: 'bg-secondary/35',
        text: 'text-muted-foreground',
      };
    case 'info':
    default:
      return {
        icon: Info,
        border: 'border-[rgba(var(--accent-color),0.45)]',
        bg: 'bg-[rgba(var(--accent-color),0.08)]',
        text: 'text-[rgb(var(--accent-color))]',
      };
  }
}

function MarkdownCalloutBlock({ raw }: MarkdownCalloutBlockProps) {
  const parsed = parseMarkdownCalloutBlock(raw);
  if (!parsed.ok) {
    return <CalloutErrorFallback message={parsed.error.message} raw={parsed.raw} />;
  }

  const { spec } = parsed;
  const tokens = getToneTokens(spec.tone);
  const Icon = tokens.icon;

  return (
    <div className={`my-5 border ${tokens.border} ${tokens.bg}`}>
      <div className="flex items-start gap-3 px-4 py-3">
        <Icon className={`h-4 w-4 mt-0.5 ${tokens.text}`} />
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${tokens.text}`}>{spec.title}</p>
          {spec.body ? <p className="mt-1 text-sm text-foreground">{spec.body}</p> : null}
          {spec.items?.length ? (
            <ul className="mt-2 space-y-1">
              {spec.items.map((item) => (
                <li key={item} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-muted-foreground/55">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default memo(
  MarkdownCalloutBlock,
  (previousProps, nextProps) => previousProps.raw === nextProps.raw
);
