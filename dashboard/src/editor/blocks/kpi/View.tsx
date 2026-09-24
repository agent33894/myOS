import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn, Icon } from '../../../ui';
import { formatNumber } from '../format';
import type { Kpi, Metric } from './model';

function Progress({ value, target }: { value: number; target: number }) {
  const percent = Math.max(0, Math.min(100, (value / target) * 100));
  return (
    <svg className="mt-3 h-1 w-full overflow-hidden rounded-full" aria-hidden="true">
      <rect width="100%" height="100%" className="fill-text/10" />
      <rect width={`${percent}%`} height="100%" className="fill-accent" />
    </svg>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  const { delta, target } = metric;
  const numeric = typeof metric.value === 'number';
  return (
    <div className="flex min-w-40 flex-1 flex-col rounded-lg bg-raised p-4 shadow-raised">
      <div className="truncate text-sm text-text-secondary">{metric.title}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tabular-nums text-text">
          {numeric ? formatNumber(metric.value as number) : metric.value}
        </span>
        {metric.unit ? <span className="text-base font-medium text-text-secondary">{metric.unit}</span> : null}
      </div>
      {delta !== undefined || metric.deltaLabel ? (
        <div className="mt-2 flex items-center gap-1.5 text-sm">
          {delta !== undefined ? (
            <span className={cn('inline-flex items-center gap-1 font-medium tabular-nums', delta >= 0 ? 'text-success' : 'text-danger')}>
              <Icon icon={delta >= 0 ? TrendingUp : TrendingDown} size="sm" />
              {delta > 0 ? '+' : delta < 0 ? '−' : ''}
              {formatNumber(Math.abs(delta))}
            </span>
          ) : null}
          {metric.deltaLabel ? <span className="truncate text-text-tertiary">{metric.deltaLabel}</span> : null}
        </div>
      ) : null}
      {target !== undefined ? (
        <>
          <div className="mt-2 text-sm text-text-tertiary">Target {formatNumber(target)}</div>
          {numeric && target > 0 ? <Progress value={metric.value as number} target={target} /> : null}
        </>
      ) : null}
    </div>
  );
}

export default function KpiView({ value }: { value: Kpi }) {
  return (
    <div className="font-sans">
      {value.title ? <div className="mb-3 text-base font-medium text-text">{value.title}</div> : null}
      <div className="flex flex-wrap gap-3">
        {value.items.map((metric, index) => (
          <MetricCard key={index} metric={metric} />
        ))}
      </div>
    </div>
  );
}
