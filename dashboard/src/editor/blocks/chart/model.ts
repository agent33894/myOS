import { attempt, fail, isFiniteNumber, isRecord, jsonObject, text, toJson, type BlockModel } from '../model';

export const CHART_TYPES = ['line', 'bar', 'area', 'pie'] as const;
export type ChartType = (typeof CHART_TYPES)[number];

const AXIS_FORMATS = ['auto', 'year', 'quarter', 'date', 'datetime'] as const;
type AxisFormat = (typeof AXIS_FORMATS)[number];

export const MAX_POINTS = 60;
export const MAX_SLICES = 24;
export const DEFAULT_HEIGHT = 300;
const MIN_HEIGHT = 220;
const MAX_HEIGHT = 520;

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

type Row = Record<string, unknown>;

export interface Series {
  key: string;
  label?: string;
  /** Optional fixed color; otherwise the palette assigns one. */
  color?: string;
}

interface Threshold {
  value: number;
  label?: string;
  color?: string;
}

interface ChartBase {
  title?: string;
  description?: string;
  data: Row[];
  /** Pixels; omitted means the default. */
  height?: number;
}

export interface CartesianChart extends ChartBase {
  type: 'line' | 'bar' | 'area';
  xKey: string;
  series: Series[];
  stacked?: boolean;
  xAxisFormat?: AxisFormat;
  thresholds?: Threshold[];
}

export interface PieChart extends ChartBase {
  type: 'pie';
  nameKey: string;
  valueKey: string;
}

export type Chart = CartesianChart | PieChart;

const filled = (value: unknown) => value !== undefined && value !== null && !(typeof value === 'string' && !value.trim());

function color(value: unknown, label: string): string | undefined {
  const hex = text(value);
  if (hex && !HEX.test(hex)) fail(`${label} must be a hex color like #3366ff.`);
  return hex;
}

function parseSeries(value: unknown): Series[] {
  if (!Array.isArray(value) || value.length === 0) fail('Add at least one series.');
  return value.map((entry, index) => {
    if (!isRecord(entry)) fail(`Series ${index + 1} must be an object.`);
    const key = text(entry.key) ?? fail(`Series ${index + 1} needs a column.`);
    return { key, label: text(entry.label), color: color(entry.color, `Series “${key}” color`) };
  });
}

function parseThresholds(value: unknown): Threshold[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) fail('Thresholds must be a list.');
  if (value.length > 6) fail('A chart can show up to 6 thresholds.');
  const thresholds = value.map((entry, index) => {
    if (!isRecord(entry) || !isFiniteNumber(entry.value)) fail(`Threshold ${index + 1} needs a numeric value.`);
    return { value: entry.value, label: text(entry.label), color: color(entry.color, `Threshold ${index + 1} color`) };
  });
  return thresholds.length ? thresholds : undefined;
}

function parseData(value: unknown): Row[] {
  if (!Array.isArray(value) || value.length === 0) fail('Add at least one row of data.');
  return value.map((row, index) => (isRecord(row) ? row : fail(`Row ${index + 1} must be an object.`)));
}

function parseChart(raw: string): Chart {
  const source = jsonObject(raw);
  const type = text(source.type)?.toLowerCase() as ChartType | undefined;
  if (!type) fail('Choose a chart type.');
  if (!CHART_TYPES.includes(type)) fail(`“${type}” charts aren’t supported. Use line, bar, area, or pie.`);

  const base: ChartBase = {
    title: text(source.title),
    description: text(source.description),
    data: parseData(source.data),
    height: isFiniteNumber(source.height) ? Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, source.height)) : undefined,
  };

  if (type === 'pie') {
    if (base.data.length > MAX_SLICES) fail(`Pie charts show up to ${MAX_SLICES} slices.`);
    const nameKey = text(source.nameKey) ?? fail('Pie charts need a label column (nameKey).');
    const valueKey = text(source.valueKey) ?? fail('Pie charts need a value column (valueKey).');
    base.data.forEach((row, index) => {
      if (!filled(row[nameKey])) fail(`Row ${index + 1} needs a ${nameKey}.`);
      if (!isFiniteNumber(row[valueKey])) fail(`Row ${index + 1}’s ${valueKey} must be a number.`);
    });
    return { ...base, type, nameKey, valueKey };
  }

  if (base.data.length > MAX_POINTS) fail(`Charts show up to ${MAX_POINTS} rows.`);
  const xKey = text(source.xKey) ?? fail('Charts need a label column (xKey).');
  const series = parseSeries(source.series);
  base.data.forEach((row, index) => {
    if (!filled(row[xKey])) fail(`Row ${index + 1} needs a ${xKey}.`);
    for (const { key } of series) {
      if (!isFiniteNumber(row[key])) fail(`Row ${index + 1}’s ${key} must be a number.`);
    }
  });

  const xAxisFormat = text(source.xAxisFormat)?.toLowerCase() as AxisFormat | undefined;
  if (xAxisFormat && !AXIS_FORMATS.includes(xAxisFormat)) fail(`“${xAxisFormat}” isn’t an axis format.`);

  return {
    ...base,
    type,
    xKey,
    series,
    stacked: typeof source.stacked === 'boolean' ? source.stacked : undefined,
    xAxisFormat,
    thresholds: parseThresholds(source.thresholds),
  };
}

export const chartModel: BlockModel<Chart> = {
  parse: (raw) => attempt(() => parseChart(raw)),
  // Key order follows the way people read a chart spec: what, then data, then mapping.
  serialize: (chart) => {
    const { type, title, description, height, data } = chart;
    const mapping =
      chart.type === 'pie'
        ? { nameKey: chart.nameKey, valueKey: chart.valueKey }
        : {
            xKey: chart.xKey,
            series: chart.series,
            stacked: chart.stacked,
            xAxisFormat: chart.xAxisFormat,
            thresholds: chart.thresholds,
          };
    return toJson({ type, title, description, height, data, ...mapping });
  },
};

/** Whether a fence without a language is a chart spec (older files wrote charts that way). */
export const looksLikeChart = (raw: string) => raw.trimStart().startsWith('{') && chartModel.parse(raw).ok;

export const newChart = (): Chart => ({
  type: 'bar',
  title: 'Chart',
  data: [
    { label: 'Mon', value: 4 },
    { label: 'Tue', value: 7 },
    { label: 'Wed', value: 5 },
    { label: 'Thu', value: 9 },
    { label: 'Fri', value: 6 },
  ],
  xKey: 'label',
  series: [{ key: 'value', label: 'Value' }],
});

/** Switch type, carrying the column mapping across the cartesian/pie divide. */
export function withType(chart: Chart, type: ChartType): Chart {
  if (type === chart.type) return chart;
  const { title, description, height, data } = chart;
  const base = { title, description, height, data };
  if (type === 'pie') {
    if (chart.type === 'pie') return chart;
    return { ...base, type, nameKey: chart.xKey, valueKey: chart.series[0]?.key ?? 'value' };
  }
  if (chart.type === 'pie') return { ...base, type, xKey: chart.nameKey, series: [{ key: chart.valueKey }] };
  return { ...chart, type };
}

/** Column names in display order: label column first, then the plotted values. */
export function columnsOf(chart: Chart): string[] {
  return chart.type === 'pie' ? [chart.nameKey, chart.valueKey] : [chart.xKey, ...chart.series.map((entry) => entry.key)];
}
