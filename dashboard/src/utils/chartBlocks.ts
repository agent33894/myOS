export const SUPPORTED_CHART_TYPES = ['line', 'bar', 'area', 'pie'] as const;
export type MarkdownChartType = (typeof SUPPORTED_CHART_TYPES)[number];
const SUPPORTED_X_AXIS_FORMATS = ['auto', 'year', 'quarter', 'date', 'datetime'] as const;
export type MarkdownXAxisFormat = (typeof SUPPORTED_X_AXIS_FORMATS)[number];

export const MAX_CARTESIAN_POINTS = 60;
export const MAX_PIE_SLICES = 24;

export const DEFAULT_CHART_HEIGHT = 300;
export const MIN_CHART_HEIGHT = 220;
export const MAX_CHART_HEIGHT = 520;

const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export interface MarkdownChartSeries {
  key: string;
  label?: string;
  color?: string;
}

export interface MarkdownChartThreshold {
  value: number;
  label?: string;
  color?: string;
}

interface MarkdownChartBase {
  type: MarkdownChartType;
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  height: number;
}

export interface MarkdownCartesianChartSpec extends MarkdownChartBase {
  type: 'line' | 'bar' | 'area';
  xKey: string;
  series: MarkdownChartSeries[];
  stacked?: boolean;
  xAxisFormat?: MarkdownXAxisFormat;
  thresholds?: MarkdownChartThreshold[];
}

export interface MarkdownPieChartSpec extends MarkdownChartBase {
  type: 'pie';
  nameKey: string;
  valueKey: string;
}

export type MarkdownChartSpec = MarkdownCartesianChartSpec | MarkdownPieChartSpec;

interface MarkdownChartParseError {
  code:
    | 'invalid-json'
    | 'invalid-chart-spec'
    | 'unsupported-chart-type'
    | 'invalid-data';
  message: string;
}

type MarkdownChartParseResult =
  | {
      ok: true;
      spec: MarkdownChartSpec;
    }
  | {
      ok: false;
      error: MarkdownChartParseError;
      raw: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseHeight(value: unknown): number {
  if (!isFiniteNumber(value)) return DEFAULT_CHART_HEIGHT;
  return Math.min(MAX_CHART_HEIGHT, Math.max(MIN_CHART_HEIGHT, value));
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function parseDescription(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const asString = toTrimmedString(value);
  return asString ?? undefined;
}

function parseSeries(value: unknown): MarkdownChartSeries[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('`series` must be a non-empty array.');
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`series[${index}] must be an object.`);
    }

    const key = toTrimmedString(entry.key);
    if (!key) {
      throw new Error(`series[${index}].key must be a non-empty string.`);
    }

    const label = parseDescription(entry.label);
    const color = parseDescription(entry.color);
    if (color && !HEX_COLOR_PATTERN.test(color)) {
      throw new Error(
        `series[${index}].color must be a hex color like #3366ff or #36f.`
      );
    }

    return { key, label, color };
  });
}

function parseXAxisFormat(value: unknown): MarkdownXAxisFormat | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const format = toTrimmedString(value)?.toLowerCase() as MarkdownXAxisFormat | undefined;
  if (!format) {
    return undefined;
  }

  if (!SUPPORTED_X_AXIS_FORMATS.includes(format)) {
    throw new Error(
      `Unsupported xAxisFormat "${format}". Supported formats: ${SUPPORTED_X_AXIS_FORMATS.join(', ')}.`
    );
  }

  return format;
}

function parseThresholds(value: unknown): MarkdownChartThreshold[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error('`thresholds` must be an array when provided.');
  }

  if (value.length === 0) {
    return undefined;
  }

  if (value.length > 6) {
    throw new Error('`thresholds` supports up to 6 reference lines.');
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`thresholds[${index}] must be an object.`);
    }

    if (!isFiniteNumber(entry.value)) {
      throw new Error(`thresholds[${index}].value must be a finite number.`);
    }

    const label = parseDescription(entry.label);
    const color = parseDescription(entry.color);
    if (color && !HEX_COLOR_PATTERN.test(color)) {
      throw new Error(
        `thresholds[${index}].color must be a hex color like #3366ff or #36f.`
      );
    }

    return {
      value: entry.value,
      label,
      color,
    };
  });
}

function parseData(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('`data` must be a non-empty array.');
  }

  const data = value.map((row, index) => {
    if (!isRecord(row)) {
      throw new Error(`data[${index}] must be an object.`);
    }
    return row;
  });

  return data;
}

function validateCartesianRows(
  data: Record<string, unknown>[],
  xKey: string,
  series: MarkdownChartSeries[]
): void {
  for (let i = 0; i < data.length; i += 1) {
    const row = data[i];
    const xValue = row[xKey];
    if (xValue === undefined || xValue === null || (typeof xValue === 'string' && !xValue.trim())) {
      throw new Error(`data[${i}].${xKey} must contain a non-empty value.`);
    }

    for (const entry of series) {
      const seriesValue = row[entry.key];
      if (!isFiniteNumber(seriesValue)) {
        throw new Error(`data[${i}].${entry.key} must be a finite number.`);
      }
    }
  }
}

function validatePieRows(
  data: Record<string, unknown>[],
  nameKey: string,
  valueKey: string
): void {
  for (let i = 0; i < data.length; i += 1) {
    const row = data[i];
    const nameValue = row[nameKey];
    const valueValue = row[valueKey];

    if (
      nameValue === undefined ||
      nameValue === null ||
      (typeof nameValue === 'string' && !nameValue.trim())
    ) {
      throw new Error(`data[${i}].${nameKey} must contain a non-empty value.`);
    }

    if (!isFiniteNumber(valueValue)) {
      throw new Error(`data[${i}].${valueKey} must be a finite number.`);
    }
  }
}

function parseRawChartSpec(rawSpec: Record<string, unknown>): MarkdownChartSpec {
  const type = toTrimmedString(rawSpec.type)?.toLowerCase() as MarkdownChartType | undefined;
  if (!type) {
    throw new Error('`type` is required.');
  }
  if (!SUPPORTED_CHART_TYPES.includes(type)) {
    throw new Error(
      `Unsupported chart type "${type}". Supported types: ${SUPPORTED_CHART_TYPES.join(', ')}.`
    );
  }

  const title = toTrimmedString(rawSpec.title);
  if (!title) {
    throw new Error('`title` must be a non-empty string.');
  }

  const description = parseDescription(rawSpec.description);
  const data = parseData(rawSpec.data);
  const height = parseHeight(rawSpec.height);

  if (type === 'pie') {
    if (data.length > MAX_PIE_SLICES) {
      throw new Error(`Pie charts are limited to ${MAX_PIE_SLICES} slices.`);
    }

    const nameKey = toTrimmedString(rawSpec.nameKey);
    const valueKey = toTrimmedString(rawSpec.valueKey);
    if (!nameKey) {
      throw new Error('`nameKey` is required for pie charts.');
    }
    if (!valueKey) {
      throw new Error('`valueKey` is required for pie charts.');
    }

    validatePieRows(data, nameKey, valueKey);

    return {
      type,
      title,
      description,
      data,
      nameKey,
      valueKey,
      height,
    };
  }

  if (data.length > MAX_CARTESIAN_POINTS) {
    throw new Error(
      `${type} charts are limited to ${MAX_CARTESIAN_POINTS} data points.`
    );
  }

  const xKey = toTrimmedString(rawSpec.xKey);
  if (!xKey) {
    throw new Error('`xKey` is required for line, bar, and area charts.');
  }

  const series = parseSeries(rawSpec.series);
  validateCartesianRows(data, xKey, series);

  return {
    type,
    title,
    description,
    data,
    xKey,
    series,
    stacked: parseOptionalBoolean(rawSpec.stacked),
    xAxisFormat: parseXAxisFormat(rawSpec.xAxisFormat),
    thresholds: parseThresholds(rawSpec.thresholds),
    height,
  };
}

function classifyError(error: Error): MarkdownChartParseError['code'] {
  const message = error.message.toLowerCase();
  if (message.includes('unsupported chart type')) {
    return 'unsupported-chart-type';
  }
  if (message.includes('json')) {
    return 'invalid-json';
  }
  if (message.includes('data[')) {
    return 'invalid-data';
  }
  return 'invalid-chart-spec';
}

export function parseMarkdownChartBlock(raw: string): MarkdownChartParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      ok: false,
      raw,
      error: {
        code: 'invalid-json',
        message: 'Chart block is empty.',
      },
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!isRecord(parsed)) {
      return {
        ok: false,
        raw,
        error: {
          code: 'invalid-chart-spec',
          message: 'Chart block must be a JSON object.',
        },
      };
    }

    return {
      ok: true,
      spec: parseRawChartSpec(parsed),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to parse chart block.';
    const code =
      error instanceof Error
        ? classifyError(error)
        : 'invalid-chart-spec';

    return {
      ok: false,
      raw,
      error: {
        code,
        message:
          code === 'invalid-json'
            ? `Invalid chart JSON: ${message}`
            : message,
      },
    };
  }
}
