import type {
  MarkdownCartesianChartSpec,
  MarkdownChartSeries,
  MarkdownChartSpec,
} from '../../utils/chartBlocks';

type NumericFormat = 'number' | 'percent';
type XAxisValueFormat = 'category' | 'number' | 'year' | 'date' | 'datetime' | 'quarter';
type XAxisLabelDisplay = 'tick' | 'tooltip' | 'description';

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Math.abs(value) < 1 ? 2 : 0,
    maximumFractionDigits: 3,
  }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatTickValue(value: unknown, numericFormat: NumericFormat = 'number'): string {
  if (isFiniteNumber(value)) {
    return numericFormat === 'percent' ? formatPercent(value) : formatNumber(value);
  }
  if (typeof value === 'string') return value;
  return String(value);
}

export function truncateLabel(value: string, maxLength = 14): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

export function inferNumericFormat(values: number[]): NumericFormat {
  if (values.length === 0) return 'number';
  const maxAbsolute = Math.max(...values.map((value) => Math.abs(value)));
  const hasFractionalValue = values.some((value) => !Number.isInteger(value));
  return maxAbsolute <= 1.001 && hasFractionalValue ? 'percent' : 'number';
}

function normalizeLabel(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseYearValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1500 && value <= 3000) {
    return value;
  }
  if (typeof value !== 'string' || !/^\d{4}$/.test(value.trim())) return null;
  const parsed = Number.parseInt(value.trim(), 10);
  return parsed >= 1500 && parsed <= 3000 ? parsed : null;
}

function isQuarterString(value: string): boolean {
  return /^(Q[1-4](\s*[-/]?\s*\d{2,4})?|\d{4}\s*Q[1-4])$/i.test(value.trim());
}

function normalizeQuarterLabel(value: string): string {
  const trimmed = value.trim();
  const quarterYearMatch = trimmed.match(/^Q([1-4])\s*[-/]?\s*(\d{2,4})$/i);
  if (quarterYearMatch) return `Q${quarterYearMatch[1]} ${quarterYearMatch[2]}`;
  const yearQuarterMatch = trimmed.match(/^(\d{4})\s*Q([1-4])$/i);
  if (yearQuarterMatch) return `Q${yearQuarterMatch[2]} ${yearQuarterMatch[1]}`;
  const quarterOnlyMatch = trimmed.match(/^Q([1-4])$/i);
  return quarterOnlyMatch ? `Q${quarterOnlyMatch[1]}` : trimmed;
}

function parseDateValue(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || parseYearValue(trimmed) !== null || isQuarterString(trimmed)) return null;
  const hasDateHints = /[-/]/.test(trimmed)
    || /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(trimmed)
    || /^\d{8}$/.test(trimmed);
  if (!hasDateHints) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function inferXAxisValueFormat(spec: MarkdownCartesianChartSpec): XAxisValueFormat {
  if (spec.xAxisFormat && spec.xAxisFormat !== 'auto') return spec.xAxisFormat;
  const values = spec.data
    .map((row) => row[spec.xKey])
    .filter((value) => value !== undefined && value !== null);
  if (values.length === 0) return 'category';
  if (values.every((value) => parseYearValue(value) !== null)) {
    return 'year';
  }
  if (values.every((value) => typeof value === 'string' && isQuarterString(value))) return 'quarter';
  if (values.every((value) => parseDateValue(value) !== null)) return 'date';
  if (values.every(isFiniteNumber)) return 'number';
  return 'category';
}

function describeXAxis(format: XAxisValueFormat, xKey: string): string {
  switch (format) {
    case 'year':
      return 'calendar years';
    case 'quarter':
      return 'quarters';
    case 'date':
      return 'calendar dates';
    case 'datetime':
      return 'timestamped dates';
    case 'number':
      return `${normalizeLabel(xKey)} values`;
    case 'category':
      return normalizeLabel(xKey);
  }
}

export function formatXAxisValue(
  value: unknown,
  format: XAxisValueFormat,
  display: XAxisLabelDisplay,
): string {
  if (format === 'year') {
    const year = parseYearValue(value);
    return year !== null ? String(year) : formatTickValue(value);
  }
  if (format === 'quarter') {
    return typeof value === 'string' ? normalizeQuarterLabel(value) : String(value ?? '');
  }
  if (format === 'date') {
    const parsedDate = parseDateValue(value);
    if (!parsedDate) return formatTickValue(value);
    const options: Intl.DateTimeFormatOptions = display === 'tooltip'
      ? { month: 'long', day: 'numeric', year: 'numeric' }
      : display === 'tick'
        ? { month: 'short', day: 'numeric' }
        : { month: 'short', day: 'numeric', year: 'numeric' };
    return new Intl.DateTimeFormat('en-US', options).format(parsedDate);
  }
  if (format === 'datetime') {
    const parsedDate = parseDateValue(value);
    if (!parsedDate) return formatTickValue(value);
    const options: Intl.DateTimeFormatOptions = display === 'tooltip'
      ? { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }
      : { month: 'short', day: 'numeric', hour: 'numeric' };
    return new Intl.DateTimeFormat('en-US', options).format(parsedDate);
  }
  return format === 'number' ? formatTickValue(value, 'number') : String(value ?? '');
}

export function getCartesianNumericValues(spec: MarkdownCartesianChartSpec): number[] {
  const values: number[] = [];
  for (const row of spec.data) {
    for (const entry of spec.series) {
      const value = row[entry.key];
      if (isFiniteNumber(value)) values.push(value);
    }
  }
  return values;
}

export function buildChartInterpretation(spec: MarkdownChartSpec): {
  readingGuide: string;
  keyObservation?: string;
} {
  if (spec.type === 'pie') {
    const values = spec.data.map((row) => row[spec.valueKey]).filter(isFiniteNumber);
    const numericFormat = inferNumericFormat(values);
    const total = values.reduce((sum, value) => sum + value, 0);
    const largestSlice = spec.data
      .map((row) => ({
        label: formatTickValue(row[spec.nameKey]),
        value: isFiniteNumber(row[spec.valueKey])
          ? row[spec.valueKey] as number
          : Number.NEGATIVE_INFINITY,
      }))
      .sort((left, right) => right.value - left.value)[0];
    const readingGuide = `Each slice maps to ${normalizeLabel(spec.nameKey)} and size reflects ${normalizeLabel(spec.valueKey)}. Hover slices for exact values; the center shows total or the hovered slice.`;
    if (!largestSlice || !Number.isFinite(largestSlice.value) || total <= 0) return { readingGuide };
    const share = (largestSlice.value / total) * 100;
    return {
      readingGuide,
      keyObservation: `Largest slice: ${largestSlice.label} at ${formatTickValue(largestSlice.value, numericFormat)} (${share.toFixed(1)}% of total).`,
    };
  }

  const numericFormat = inferNumericFormat(getCartesianNumericValues(spec));
  const xAxisFormat = inferXAxisValueFormat(spec);
  const seriesLabels = spec.series.map((entry) => entry.label || normalizeLabel(entry.key));
  const metricDescription = seriesLabels.length === 1
    ? `${seriesLabels[0]} is the plotted metric.`
    : `Series shown: ${seriesLabels.join(', ')}.`;
  const readingGuide = `X-axis shows ${describeXAxis(xAxisFormat, spec.xKey)} and Y-axis shows ${numericFormat === 'percent' ? 'percentage values' : 'numeric values'}. ${metricDescription} Hover a point for exact values.`;
  if (spec.data.length < 2 || spec.series.length === 0) return { readingGuide };

  const primarySeries = spec.series[0];
  const firstRow = spec.data[0];
  const lastRow = spec.data[spec.data.length - 1];
  const firstValue = firstRow?.[primarySeries.key];
  const lastValue = lastRow?.[primarySeries.key];
  if (!isFiniteNumber(firstValue) || !isFiniteNumber(lastValue)) return { readingGuide };

  const primaryLabel = primarySeries.label || normalizeLabel(primarySeries.key);
  const firstX = formatXAxisValue(firstRow?.[spec.xKey], xAxisFormat, 'description');
  const lastX = formatXAxisValue(lastRow?.[spec.xKey], xAxisFormat, 'description');
  const delta = lastValue - firstValue;
  if (Math.abs(delta) < Number.EPSILON) {
    return {
      readingGuide,
      keyObservation: `${primaryLabel} remains effectively flat from ${firstX} (${formatTickValue(firstValue, numericFormat)}) to ${lastX} (${formatTickValue(lastValue, numericFormat)}).`,
    };
  }
  const direction = delta > 0 ? 'increases' : 'decreases';
  return {
    readingGuide,
    keyObservation: `${primaryLabel} ${direction} from ${formatTickValue(firstValue, numericFormat)} at ${firstX} to ${formatTickValue(lastValue, numericFormat)} at ${lastX} (change: ${formatTickValue(Math.abs(delta), numericFormat)}).`,
  };
}

export function getSeriesColor(
  series: MarkdownChartSeries,
  index: number,
  palette: string[],
): string {
  return series.color || palette[index % palette.length] || '#4f46e5';
}
