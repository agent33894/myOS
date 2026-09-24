import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, isValid, parseISO } from 'date-fns';
import { projectSwatches } from '@shared/design-system/accents';
import { useAccent } from '../../../hooks/useAccent';
import { formatNumber, formatTick } from '../format';
import { DEFAULT_HEIGHT, type CartesianChart, type Chart, type PieChart as PieSpec } from './model';
import { niceTicks, valueRange } from './scale';

// Loaded on demand (recharts is heavy). Axis, grid, and cursor colors come from
// tokens in _tiptap.css; series use the accent, then the project swatches.

interface Entry {
  name?: string | number;
  value?: unknown;
  color?: string;
}

function Swatch({ color }: { color?: string }) {
  return (
    <svg className="size-2 shrink-0" viewBox="0 0 8 8" aria-hidden="true">
      <circle cx="4" cy="4" r="4" fill={color} />
    </svg>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Entry[]; label?: unknown }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-32 rounded-md bg-overlay px-3 py-2 font-sans text-sm text-text shadow-overlay">
      {label !== undefined && label !== '' ? <div className="mb-1 font-medium">{formatLabel(label)}</div> : null}
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <Swatch color={entry.color} />
          <span className="text-text-secondary">{entry.name}</span>
          <span className="ml-auto pl-3 font-medium tabular-nums">
            {typeof entry.value === 'number' ? formatNumber(entry.value) : String(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChartLegend({ payload, order }: { payload?: Array<Entry & { dataKey?: unknown }>; order?: string[] }) {
  // Recharts sorts legend entries by name; show them in series order instead.
  const entries = order ? [...(payload ?? [])].sort((a, b) => order.indexOf(String(a.dataKey)) - order.indexOf(String(b.dataKey))) : payload;
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 font-sans text-sm text-text-secondary">
      {entries?.map((entry, index) => (
        <span key={index} className="inline-flex items-center gap-1.5">
          <Swatch color={entry.color} />
          {entry.value as string}
        </span>
      ))}
    </div>
  );
}

function formatLabel(value: unknown): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = parseISO(value);
    if (isValid(date)) return format(date, 'MMM d');
  }
  return formatTick(value);
}

function Cartesian({ chart, palette }: { chart: CartesianChart; palette: string[] }) {
  const Frame = chart.type === 'line' ? LineChart : chart.type === 'area' ? AreaChart : BarChart;
  const stack = chart.stacked ? 'stack' : undefined;
  const ticks = useMemo(() => niceTicks(...valueRange(chart)), [chart]);
  return (
    <Frame data={chart.data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
      <CartesianGrid vertical={false} />
      <XAxis dataKey={chart.xKey} tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatLabel} minTickGap={16} />
      <YAxis
        tickLine={false}
        axisLine={false}
        tickMargin={4}
        width={48}
        ticks={ticks}
        domain={[ticks[0], ticks[ticks.length - 1]]}
        tickFormatter={formatTick}
      />
      <Tooltip content={<ChartTooltip />} isAnimationActive={false} />
      {chart.series.length > 1 ? <Legend content={<ChartLegend order={chart.series.map((series) => series.key)} />} /> : null}
      {chart.thresholds?.map((threshold, index) => (
        <ReferenceLine
          key={index}
          y={threshold.value}
          stroke={threshold.color}
          strokeDasharray="4 4"
          label={threshold.label ? { value: threshold.label, position: 'insideTopRight' } : undefined}
        />
      ))}
      {chart.series.map((series, index) => {
        const color = series.color ?? palette[index % palette.length];
        const name = series.label ?? series.key;
        if (chart.type === 'line') {
          return <Line key={series.key} type="monotone" dataKey={series.key} name={name} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />;
        }
        if (chart.type === 'area') {
          return (
            <Area key={series.key} type="monotone" dataKey={series.key} name={name} stroke={color} strokeWidth={2} fill={color} fillOpacity={0.14} stackId={stack} />
          );
        }
        return <Bar key={series.key} dataKey={series.key} name={name} fill={color} radius={[4, 4, 0, 0]} maxBarSize={48} stackId={stack} />;
      })}
    </Frame>
  );
}

function Donut({ chart, palette }: { chart: PieSpec; palette: string[] }) {
  return (
    <PieChart>
      <Pie data={chart.data} dataKey={chart.valueKey} nameKey={chart.nameKey} innerRadius="58%" outerRadius="82%" paddingAngle={2} stroke="none">
        {chart.data.map((_, index) => (
          <Cell key={index} fill={palette[index % palette.length]} />
        ))}
      </Pie>
      <Tooltip content={<ChartTooltip />} isAnimationActive={false} />
      <Legend content={<ChartLegend />} />
    </PieChart>
  );
}

export default function ChartView({ value: chart }: { value: Chart }) {
  const { hex } = useAccent();
  const palette = useMemo(() => [hex, ...projectSwatches.map((swatch) => swatch.hex)], [hex]);
  return (
    <figure className="chart-block m-0 font-sans">
      {chart.title || chart.description ? (
        <figcaption className="mb-3">
          {chart.title ? <div className="text-base font-medium text-text">{chart.title}</div> : null}
          {chart.description ? <div className="text-sm text-text-secondary">{chart.description}</div> : null}
        </figcaption>
      ) : null}
      <ResponsiveContainer width="100%" height={chart.height ?? DEFAULT_HEIGHT}>
        {chart.type === 'pie' ? <Donut chart={chart} palette={palette} /> : <Cartesian chart={chart} palette={palette} />}
      </ResponsiveContainer>
    </figure>
  );
}
