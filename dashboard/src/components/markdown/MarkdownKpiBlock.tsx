import { memo } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Target } from 'lucide-react';
import { parseMarkdownKpiBlock } from '../../utils/richBlocks';

interface MarkdownKpiBlockProps {
  raw: string;
}

function KpiErrorFallback({ message, raw }: { message: string; raw: string }) {
  return (
    <div className="my-5 border border-[hsl(var(--ed-warning))]/45 bg-card">
      <div className="flex items-center gap-2 border-b border-[hsl(var(--ed-warning))]/35 px-3 py-2 bg-[hsl(var(--ed-warning))]/8">
        <Target className="h-4 w-4 text-[hsl(var(--ed-warning))]" />
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--ed-warning))]">
          KPI Block Warning
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

function formatValue(value: string | number, unit?: string): string {
  if (typeof value === 'number') {
    const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
    return `${formatter.format(value)}${unit ? ` ${unit}` : ''}`;
  }

  return unit ? `${value} ${unit}` : value;
}

function DeltaBadge({ delta, label }: { delta: number; label?: string }) {
  const isPositive = delta > 0;
  const isNegative = delta < 0;
  const isFlat = delta === 0;
  const deltaColor = isPositive
    ? 'text-[hsl(var(--ed-success))]'
    : isNegative
      ? 'text-[hsl(var(--ed-error))]'
      : 'text-muted-foreground';

  const Icon = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : ArrowRight;
  return (
    <div className={`text-xs font-medium inline-flex items-center gap-1 ${deltaColor}`}>
      <Icon className="w-3 h-3" />
      <span>
        {isFlat ? '0' : delta > 0 ? `+${delta}` : String(delta)}
        {label ? ` ${label}` : ''}
      </span>
    </div>
  );
}

function MarkdownKpiBlock({ raw }: MarkdownKpiBlockProps) {
  const parsed = parseMarkdownKpiBlock(raw);
  if (!parsed.ok) {
    return <KpiErrorFallback message={parsed.error.message} raw={parsed.raw} />;
  }

  const { spec } = parsed;
  const columnClass = spec.items.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2';

  return (
    <div className="my-6 border border-border/60 bg-card p-4">
      {spec.title ? (
        <div className="mb-3">
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">{spec.title}</p>
        </div>
      ) : null}

      <div className={`grid grid-cols-1 ${columnClass} gap-3`}>
        {spec.items.map((item) => (
          <div key={item.title} className="border border-border/50 bg-secondary/25 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{item.title}</p>
            <p className="mt-1 text-2xl font-serif text-foreground tabular-nums">
              {formatValue(item.value, item.unit)}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              {item.delta !== undefined ? <DeltaBadge delta={item.delta} label={item.deltaLabel} /> : <span />}
              {item.target !== undefined ? (
                <span className="text-xs text-muted-foreground">Target: {item.target}</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(
  MarkdownKpiBlock,
  (previousProps, nextProps) => previousProps.raw === nextProps.raw
);
