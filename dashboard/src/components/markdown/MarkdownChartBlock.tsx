import { memo, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAccent } from '../../hooks/useAccent';
import { generateEditorialChartScale, hexToRgbString } from '../../utils/colorPalette';
import type {
  MarkdownCartesianChartSpec,
  MarkdownPieChartSpec,
} from '../../utils/chartBlocks';
import { parseMarkdownChartBlock } from '../../utils/chartBlocks';
import {
  buildChartInterpretation,
  formatNumber,
  formatPercent,
  formatTickValue,
  formatXAxisValue,
  getCartesianNumericValues,
  getSeriesColor,
  inferNumericFormat,
  inferXAxisValueFormat,
  isFiniteNumber,
  truncateLabel,
} from './chartPresentation';

interface MarkdownChartBlockProps {
  raw: string;
}

interface StableChartContainerProps {
  height: number;
  children: (size: { width: number; height: number }) => ReactNode;
}

function StableChartContainer({ height, children }: StableChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    let rafId = 0;
    const applyWidth = (nextWidth: number) => {
      const roundedWidth = Math.max(0, Math.round(nextWidth));
      setWidth((previousWidth) =>
        Math.abs(previousWidth - roundedWidth) >= 1 ? roundedWidth : previousWidth
      );
    };

    const measure = () => {
      applyWidth(node.getBoundingClientRect().width);
    };

    measure();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver((entries) => {
          const measuredWidth = entries[0]?.contentRect.width ?? 0;
          cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(() => {
            applyWidth(measuredWidth);
          });
        })
        : null;

    resizeObserver?.observe(node);
    window.addEventListener('resize', measure);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full" style={{ height }}>
      {width > 0 ? children({ width, height }) : null}
    </div>
  );
}

function ChartErrorFallback({
  message,
  raw,
  accentColor,
}: {
  message: string;
  raw: string;
  accentColor: string;
}) {
  return (
    <div className="my-5 border border-[hsl(var(--ed-warning))]/45 bg-card">
      <div className="h-[2px] w-full" style={{ backgroundColor: accentColor }} />
      <div className="flex items-center gap-2 border-b border-[hsl(var(--ed-warning))]/35 px-3 py-2 bg-[hsl(var(--ed-warning))]/8">
        <AlertTriangle className="h-4 w-4 text-[hsl(var(--ed-warning))]" />
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--ed-warning))]">
          Chart Block Warning
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


function CartesianChart({
  spec,
  palette,
  accentColor,
}: {
  spec: MarkdownCartesianChartSpec;
  palette: string[];
  accentColor: string;
}) {
  const gradientPrefix = useId().replace(/:/g, '');
  const numericValues = useMemo(() => getCartesianNumericValues(spec), [spec]);
  const numericFormat = useMemo(() => inferNumericFormat(numericValues), [numericValues]);
  const xAxisFormat = useMemo(() => inferXAxisValueFormat(spec), [spec]);

  const showLegend = spec.series.length > 1;
  const chartMargins = useMemo(
    () => ({ top: 10, right: 16, left: 8, bottom: 10 }),
    []
  );
  const yAxisWidth = useMemo(() => {
    const candidateValues = [...numericValues];

    for (const threshold of spec.thresholds || []) {
      candidateValues.push(threshold.value);
    }

    if (candidateValues.length === 0) {
      candidateValues.push(0);
    }

    const maxLabelLength = candidateValues.reduce((maxLength, value) => {
      const formatted = formatTickValue(value, numericFormat);
      return Math.max(maxLength, formatted.length);
    }, 0);

    // Reserve enough space for formatted ticks like 140,000 without clipping.
    return Math.min(108, Math.max(56, maxLabelLength * 8 + 14));
  }, [numericValues, numericFormat, spec.thresholds]);
  const useCategoryPaletteForBar =
    spec.type === 'bar' &&
    spec.series.length === 1 &&
    !spec.stacked &&
    spec.data.length > 2;

  const maxBySeries = useMemo(() => {
    const result = new Map<string, number>();

    for (const entry of spec.series) {
      let maxValue = Number.NEGATIVE_INFINITY;

      for (const row of spec.data) {
        const value = row[entry.key];
        if (isFiniteNumber(value) && value > maxValue) {
          maxValue = value;
        }
      }

      result.set(entry.key, maxValue);
    }

    return result;
  }, [spec]);

  const renderMetricValue = (value: unknown): string => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return numericFormat === 'percent' ? formatPercent(value) : formatNumber(value);
    }

    return String(value ?? '');
  };

  const cartesianTooltip = ({
    active,
    payload,
    label,
  }: any) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const leadColor = payload[0]?.color || accentColor;

    return (
      <div
        className="bg-card border border-border shadow-chronicle-overlay min-w-[220px]"
        style={{
          boxShadow: `0 20px 40px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px ${leadColor}1f`,
        }}
      >
        <div className="h-[2px] w-full" style={{ backgroundColor: leadColor }} />
        <div className="p-3">
          <p className="text-3xs uppercase tracking-[0.12em] text-muted-foreground mb-1">
            Data Point
          </p>
          <p className="font-serif text-base text-foreground tracking-tight mb-2">
            {formatXAxisValue(label, xAxisFormat, 'tooltip')}
          </p>
          <div className="space-y-1.5">
            {payload.map((entry: { color?: string; name?: string; value?: number | string }, index: number) => (
              <div key={`tooltip-row-${index}`} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: entry.color || leadColor }}
                  />
                  {entry.name || 'Value'}
                </span>
                <span className="font-medium text-foreground tabular-nums">
                  {renderMetricValue(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const legendFormatter = (value: string): ReactNode => (
    <span className="text-xs text-muted-foreground">{value}</span>
  );

  const cartesianPrimitives = (
    <>
      <defs>
        {spec.series.map((entry, index) => {
          const color = getSeriesColor(entry, index, palette);
          const barGradientId = `${gradientPrefix}-${entry.key}-bar-gradient`;
          const barHighlightGradientId = `${gradientPrefix}-${entry.key}-bar-highlight-gradient`;
          const areaGradientId = `${gradientPrefix}-${entry.key}-area-gradient`;

          return (
            <g key={`${entry.key}-defs`}>
              <linearGradient id={barGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.95} />
                <stop offset="100%" stopColor={color} stopOpacity={0.62} />
              </linearGradient>
              <linearGradient id={barHighlightGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={1} />
                <stop offset="100%" stopColor={color} stopOpacity={0.84} />
              </linearGradient>
              <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0.04} />
              </linearGradient>
            </g>
          );
        })}
      </defs>

      <CartesianGrid
        strokeDasharray="2 6"
        stroke="rgba(var(--accent-color),0.08)"
        vertical={false}
      />

      <XAxis
        dataKey={spec.xKey}
        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
        tickLine={false}
        axisLine={{ stroke: 'var(--border)', opacity: 0.8 }}
        tickMargin={8}
        padding={{ left: 8, right: 8 }}
        tickFormatter={(value) =>
          truncateLabel(formatXAxisValue(value, xAxisFormat, 'tick'))
        }
        minTickGap={18}
      />

      <YAxis
        allowDecimals
        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        width={yAxisWidth}
        tickFormatter={(value) =>
          typeof value === 'number' ? formatTickValue(value, numericFormat) : String(value)
        }
      />

      {(spec.thresholds || []).map((threshold, index) => (
        <ReferenceLine
          key={`threshold-${index}`}
          y={threshold.value}
          stroke={threshold.color || accentColor}
          strokeWidth={1.5}
          strokeDasharray="6 4"
          ifOverflow="extendDomain"
          label={{
            value: threshold.label || formatTickValue(threshold.value, numericFormat),
            position: 'insideTopRight',
            fill: 'hsl(var(--muted-foreground))',
            fontSize: 10,
            fontWeight: 600,
          }}
        />
      ))}

      <Tooltip
        content={cartesianTooltip}
        isAnimationActive={false}
        animationDuration={0}
        offset={14}
        allowEscapeViewBox={{ x: false, y: false }}
        reverseDirection={{ x: true, y: true }}
        wrapperStyle={{ pointerEvents: 'none', zIndex: 60 }}
        cursor={
          spec.type === 'bar'
            ? false
            : {
                stroke: 'rgba(var(--accent-color),0.42)',
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }
        }
      />

      {showLegend ? (
        <Legend
          iconType="circle"
          iconSize={8}
          verticalAlign="top"
          align="right"
          wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
          formatter={legendFormatter}
        />
      ) : null}
    </>
  );

  if (spec.type === 'line') {
    return (
      <StableChartContainer height={spec.height}>
        {({ width, height }) => (
          <LineChart
            width={width}
            height={height}
            data={spec.data}
            margin={chartMargins}
          >
            {cartesianPrimitives}
            {spec.series.map((entry, index) => (
              <Line
                key={entry.key}
                type="monotone"
                dataKey={entry.key}
                name={entry.label || entry.key}
                stroke={getSeriesColor(entry, index, palette)}
                strokeWidth={2.2}
                dot={
                  spec.data.length <= 20
                    ? { r: 2, strokeWidth: 0, fill: getSeriesColor(entry, index, palette) }
                    : false
                }
                activeDot={{ r: 4.5, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        )}
      </StableChartContainer>
    );
  }

  if (spec.type === 'bar') {
    const stackId = spec.stacked ? 'chart-stack' : undefined;

    return (
      <StableChartContainer height={spec.height}>
        {({ width, height }) => (
          <BarChart
            width={width}
            height={height}
            data={spec.data}
            margin={chartMargins}
            barCategoryGap="20%"
          >
            {cartesianPrimitives}
            {spec.series.map((entry) => (
              <Bar
                key={entry.key}
                dataKey={entry.key}
                name={entry.label || entry.key}
                fill={
                  useCategoryPaletteForBar
                    ? palette[0] || accentColor
                    : `url(#${gradientPrefix}-${entry.key}-bar-gradient)`
                }
                stackId={stackId}
                radius={[2, 2, 0, 0]}
                maxBarSize={48}
                isAnimationActive={false}
              >
                {spec.series.length === 1 && !spec.stacked
                  ? spec.data.map((row, rowIndex) => {
                      const rawValue = row[entry.key];
                      const value = isFiniteNumber(rawValue) ? rawValue : null;
                      const maxValue = maxBySeries.get(entry.key) ?? Number.NEGATIVE_INFINITY;
                      const isPeak =
                        value !== null &&
                        Number.isFinite(maxValue) &&
                        Math.abs(value - maxValue) < Number.EPSILON;

                      return (
                        <Cell
                          key={`${entry.key}-cell-${rowIndex}`}
                          fill={
                            useCategoryPaletteForBar
                              ? palette[rowIndex % palette.length] || accentColor
                              : isPeak
                              ? `url(#${gradientPrefix}-${entry.key}-bar-highlight-gradient)`
                              : `url(#${gradientPrefix}-${entry.key}-bar-gradient)`
                          }
                          fillOpacity={isPeak ? 1 : 0.92}
                          stroke={isPeak ? 'rgba(var(--accent-color), 0.45)' : 'transparent'}
                          strokeWidth={isPeak ? 1 : 0}
                        />
                      );
                    })
                  : null}
              </Bar>
            ))}
          </BarChart>
        )}
      </StableChartContainer>
    );
  }

  return (
    <StableChartContainer height={spec.height}>
      {({ width, height }) => (
        <AreaChart
          width={width}
          height={height}
          data={spec.data}
          margin={chartMargins}
        >
          {cartesianPrimitives}
          {spec.series.map((entry, index) => {
            const color = getSeriesColor(entry, index, palette);
            const gradientId = `${gradientPrefix}-${entry.key}-area-gradient`;

            return (
              <Area
                key={entry.key}
                type="monotone"
                dataKey={entry.key}
                name={entry.label || entry.key}
                stroke={color}
                fill={`url(#${gradientId})`}
                stackId={spec.stacked ? 'chart-stack' : undefined}
                strokeWidth={2}
                isAnimationActive={false}
              />
            );
          })}
        </AreaChart>
      )}
    </StableChartContainer>
  );
}

function PieChartView({
  spec,
  palette,
  accentColor,
}: {
  spec: MarkdownPieChartSpec;
  palette: string[];
  accentColor: string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const effectiveHeight = Math.max(
    190,
    Math.min(Math.round(spec.height * 0.78), 270)
  );
  const pieData = useMemo<Array<Record<string, unknown> & { __chartColor: string }>>(
    () =>
      spec.data.map((row, index) => ({
        ...(row as Record<string, unknown>),
        __chartColor: palette[index % palette.length] || '#4f46e5',
      })),
    [spec.data, palette]
  );

  const values = useMemo(
    () => pieData.map((row) => row[spec.valueKey]).filter(isFiniteNumber),
    [pieData, spec.valueKey]
  );

  const numericFormat = useMemo(() => inferNumericFormat(values), [values]);

  const total = useMemo(
    () => values.reduce((sum, value) => sum + value, 0),
    [values]
  );

  const legendItems = useMemo(
    () =>
      pieData.map((row, index) => {
        const name = row[spec.nameKey];
        const value = row[spec.valueKey];
        const numericValue = isFiniteNumber(value) ? value : 0;
        const share = total > 0 ? (numericValue / total) * 100 : 0;
        const colorValue = row.__chartColor;
        const color = typeof colorValue === 'string'
          ? colorValue
          : palette[index % palette.length] || '#4f46e5';

        return {
          id: `legend-${index}`,
          color,
          label: formatTickValue(name),
          value: numericValue,
          share,
        };
      }),
    [pieData, spec.nameKey, spec.valueKey, palette, total]
  );

  const displayValue = (value: unknown): string => {
    if (!isFiniteNumber(value)) {
      return String(value ?? '');
    }

    return numericFormat === 'percent' ? formatPercent(value) : formatNumber(value);
  };

  const pieTooltip = ({
    active,
    payload,
  }: any) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const entry = payload[0];
    const payloadRow = entry?.payload as Record<string, unknown> | undefined;
    const payloadColor = typeof payloadRow?.__chartColor === 'string'
      ? payloadRow.__chartColor
      : undefined;
    const color = entry?.fill || payloadColor || entry?.color || accentColor;

    return (
      <div
        className="bg-card border border-border shadow-chronicle-overlay min-w-[190px]"
        style={{ boxShadow: `0 20px 40px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px ${color}1f` }}
      >
        <div className="h-[2px] w-full" style={{ backgroundColor: color }} />
        <div className="p-3">
          <p className="font-serif text-base text-foreground tracking-tight mb-1">
            {entry?.name || 'Slice'}
          </p>
          <p className="text-sm text-muted-foreground tabular-nums mb-1">
            {displayValue(entry?.value)}
          </p>
          <p className="text-3xs uppercase tracking-[0.12em] text-muted-foreground">
            {entry?.percent != null && Number.isFinite(entry.percent)
              ? `${(entry.percent * 100).toFixed(1)}% of total`
              : 'Slice'}
          </p>
        </div>
      </div>
    );
  };

  function CenterLabel({
    viewBox,
  }: {
    viewBox?: {
      cx?: number;
      cy?: number;
    };
  }) {
    const cx = Number(viewBox?.cx);
    const cy = Number(viewBox?.cy);

    if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
      return null;
    }

    const focused = hoveredIndex !== null ? legendItems[hoveredIndex] : null;
    const centerValue = focused ? focused.value : total;
    const centerLabel = focused ? focused.label : 'Total';

    return (
      <g>
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          dominantBaseline="central"
          fill="hsl(var(--foreground))"
          fontFamily="var(--font-serif, serif)"
          fontSize="28"
          className="tabular-nums"
        >
          {displayValue(centerValue)}
        </text>
        <text
          x={cx}
          y={cy + 13}
          textAnchor="middle"
          dominantBaseline="central"
          fill="hsl(var(--muted-foreground))"
          fontSize="10"
          fontWeight="600"
          letterSpacing="0.12em"
          className="uppercase"
        >
          {truncateLabel(centerLabel, 16)}
        </text>
      </g>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(320px,560px)_minmax(180px,230px)] md:items-center md:justify-between">
      <div className="w-full md:max-w-[560px] md:justify-self-center">
        <StableChartContainer height={effectiveHeight}>
          {({ width, height }) => {
            const chartDiameter = Math.min(width, height);
            const outerRadius = Math.max(
              92,
              Math.min(Math.floor((chartDiameter / 2) - 8), 170)
            );
            const innerRadius = Math.max(58, Math.floor(outerRadius * 0.58));

            return (
              <PieChart width={width} height={height}>
                <Pie
                  data={pieData}
                  dataKey={spec.valueKey}
                  nameKey={spec.nameKey}
                  innerRadius={innerRadius}
                  outerRadius={outerRadius}
                  paddingAngle={1.5}
                  cornerRadius={2}
                  label={false}
                  labelLine={false}
                  isAnimationActive={false}
                  onMouseEnter={(_, index) => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {pieData.map((row, index) => {
                    const isHovered = hoveredIndex === index;
                    const colorValue = row.__chartColor;
                    const fill = typeof colorValue === 'string'
                      ? colorValue
                      : palette[index % palette.length] || '#4f46e5';

                    return (
                      <Cell
                        key={`pie-cell-${index}`}
                        fill={fill}
                        stroke={isHovered ? 'var(--border)' : 'transparent'}
                        strokeWidth={isHovered ? 1.5 : 0}
                        style={{
                          opacity: isHovered ? 1 : 0.92,
                          filter: isHovered ? 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.32))' : 'none',
                          transition: 'all 120ms ease-out',
                        }}
                      />
                    );
                  })}
                  <Label content={<CenterLabel />} position="center" />
                </Pie>
                <Tooltip
                  content={pieTooltip}
                  isAnimationActive={false}
                  animationDuration={0}
                  offset={14}
                  allowEscapeViewBox={{ x: false, y: false }}
                  reverseDirection={{ x: true, y: true }}
                  wrapperStyle={{ pointerEvents: 'none', zIndex: 60 }}
                />
              </PieChart>
            );
          }}
        </StableChartContainer>
      </div>

      <div className="border-t border-border/60 pt-2 md:border-t-0 md:border-l md:border-border/60 md:pt-0 md:pl-4">
        <div className="space-y-0.5">
          {legendItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-2 px-1.5 py-1 text-left hover:bg-secondary/25"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <span className="h-3 w-3" style={{ backgroundColor: item.color }} />
              <span className="truncate text-xs text-muted-foreground">{item.label}</span>
              <span className="text-xs font-medium tabular-nums text-foreground">{item.share.toFixed(1)}%</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MarkdownChartBlock({ raw }: MarkdownChartBlockProps) {
  const { hex: accentColor, isDark } = useAccent();
  const [isNarrativeExpanded, setIsNarrativeExpanded] = useState(false);
  const [suppressNarrativeReveal, setSuppressNarrativeReveal] = useState(false);
  const parsed = useMemo(() => parseMarkdownChartBlock(raw), [raw]);

  const palette = useMemo(() => {
    return generateEditorialChartScale(
      hexToRgbString(accentColor),
      72,
      isDark
    );
  }, [accentColor, isDark]);
  const interpretation = useMemo(
    () => (parsed.ok ? buildChartInterpretation(parsed.spec) : null),
    [parsed]
  );

  if (!parsed.ok) {
    return <ChartErrorFallback message={parsed.error.message} raw={parsed.raw} accentColor={accentColor} />;
  }

  const { spec } = parsed;
  const shapeLabel = spec.type === 'pie' ? 'slices' : 'points';
  const hasNarrative = Boolean(
    interpretation?.readingGuide || interpretation?.keyObservation
  );
  const narrativeVisibilityClasses = isNarrativeExpanded
    ? 'mt-1 max-h-40 opacity-100'
    : suppressNarrativeReveal
      ? 'mt-0 max-h-0 opacity-0'
      : 'mt-0 max-h-0 opacity-0 group-hover:max-h-40 group-hover:opacity-100 group-hover:mt-1 group-focus-within:max-h-40 group-focus-within:opacity-100 group-focus-within:mt-1';

  return (
    <div
      className="group mt-1 mb-3 overflow-visible"
      onMouseLeave={() => setSuppressNarrativeReveal(false)}
    >
      <div className="border-b border-border/45 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-serif text-base leading-tight text-foreground">
              {spec.title}
            </p>
            {spec.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{spec.description}</p>
            )}
            {hasNarrative ? (
              <div
                className={`overflow-hidden transition-[max-height,margin,opacity] duration-200 ease-out ${narrativeVisibilityClasses}`}
              >
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <span className="uppercase tracking-[0.1em] text-3xs">How to read:</span>{' '}
                  {interpretation?.readingGuide}
                </p>
                {interpretation?.keyObservation ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-foreground/85">
                    <span className="uppercase tracking-[0.1em] text-3xs text-muted-foreground">Key observation:</span>{' '}
                    {interpretation.keyObservation}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {hasNarrative ? (
              <button
                type="button"
                onClick={() => {
                  if (isNarrativeExpanded) {
                    setIsNarrativeExpanded(false);
                    setSuppressNarrativeReveal(true);
                    return;
                  }

                  setIsNarrativeExpanded(true);
                  setSuppressNarrativeReveal(false);
                }}
                aria-expanded={isNarrativeExpanded}
                className="border border-border/40 bg-background/40 px-2 py-1 text-3xs uppercase tracking-[0.1em] text-muted-foreground hover:bg-background/70"
              >
                {isNarrativeExpanded ? 'Hide notes' : 'Show notes'}
              </button>
            ) : null}
            <div className="border border-border/45 bg-background/45 px-2 py-1 text-3xs uppercase tracking-[0.1em] text-muted-foreground">
              {spec.data.length} {shapeLabel}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <div className="px-0.5 py-0 sm:px-1">
          {spec.type === 'pie' ? (
            <PieChartView spec={spec} palette={palette} accentColor={accentColor} />
          ) : (
            <CartesianChart spec={spec} palette={palette} accentColor={accentColor} />
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(
  MarkdownChartBlock,
  (previousProps, nextProps) => previousProps.raw === nextProps.raw
);
