import {
  parseMarkdownChartBlock,
  type MarkdownChartSpec,
  type MarkdownChartType,
} from '../../utils/chartBlocks';
import { parseChartDataInput } from '../../utils/chartDataImport';

export const CHART_TYPE_OPTIONS: Array<{ value: MarkdownChartType; label: string }> = [
  { value: 'line', label: 'Line' },
  { value: 'bar', label: 'Bar' },
  { value: 'area', label: 'Area' },
  { value: 'pie', label: 'Pie' },
];

export const INITIAL_CHART_DATA_INPUT = `label,value
Alpha,12
Beta,18
Gamma,10`;

export interface ChartEditorFields {
  chartType: MarkdownChartType;
  chartTitle: string;
  description: string;
  height: string;
  dataInput: string;
  xKey: string;
  nameKey: string;
  valueKey: string;
  seriesKeys: string[];
  stacked: boolean;
}

type ParsedChartData = ReturnType<typeof parseChartDataInput>;

interface ChartPreviewState {
  raw: string | null;
  error: string | null;
  spec: MarkdownChartSpec | null;
}

export function createChartEditorFields(spec?: MarkdownChartSpec | null): ChartEditorFields {
  if (!spec) {
    return {
      chartType: 'line',
      chartTitle: 'New Chart',
      description: '',
      height: '300',
      dataInput: INITIAL_CHART_DATA_INPUT,
      xKey: '',
      nameKey: '',
      valueKey: '',
      seriesKeys: [],
      stacked: false,
    };
  }

  const common = {
    chartType: spec.type,
    chartTitle: spec.title,
    description: spec.description || '',
    height: String(spec.height || 300),
    dataInput: JSON.stringify(spec.data, null, 2),
  };

  if (spec.type === 'pie') {
    return {
      ...common,
      nameKey: spec.nameKey,
      valueKey: spec.valueKey,
      xKey: '',
      seriesKeys: [],
      stacked: false,
    };
  }

  return {
    ...common,
    xKey: spec.xKey,
    seriesKeys: spec.series.map((entry) => entry.key),
    stacked: Boolean(spec.stacked),
    nameKey: '',
    valueKey: '',
  };
}

export function getNumericChartColumns(parsedData: ParsedChartData): string[] {
  if (!parsedData.ok) return [];
  return parsedData.columns.filter((column) => (
    parsedData.data.every((row) => (
      typeof row[column] === 'number' && Number.isFinite(row[column] as number)
    ))
  ));
}

export function getChartValidationError(
  fields: ChartEditorFields,
  parsedData: ParsedChartData,
): string | null {
  if (!fields.chartTitle.trim()) return 'Chart title is required.';
  if (!parsedData.ok) return parsedData.message;
  if (parsedData.data.length === 0) return 'Provide at least one data row.';
  if (fields.chartType === 'pie') {
    if (!fields.nameKey) return 'Select a label column for pie slices.';
    if (!fields.valueKey) return 'Select a numeric value column for pie slices.';
    return null;
  }
  if (!fields.xKey) return 'Select an X-axis column.';
  if (fields.seriesKeys.length === 0) return 'Select at least one numeric series column.';
  return null;
}

export function buildChartPreview(
  fields: ChartEditorFields,
  parsedData: ParsedChartData,
): ChartPreviewState {
  const validationError = getChartValidationError(fields, parsedData);
  if (!parsedData.ok) {
    return {
      raw: null,
      error: validationError || parsedData.message,
      spec: null,
    };
  }
  if (validationError) {
    return {
      raw: null,
      error: validationError,
      spec: null,
    };
  }

  const parsedHeight = Number.parseInt(fields.height, 10);
  const safeHeight = Number.isFinite(parsedHeight) ? parsedHeight : 300;
  const common = {
    type: fields.chartType,
    title: fields.chartTitle.trim(),
    description: fields.description.trim() || undefined,
    data: parsedData.data,
    height: safeHeight,
  };
  const candidate = fields.chartType === 'pie'
    ? { ...common, nameKey: fields.nameKey, valueKey: fields.valueKey }
    : {
        ...common,
        xKey: fields.xKey,
        series: fields.seriesKeys.map((key) => ({ key, label: key })),
        stacked: fields.stacked || undefined,
      };
  const verification = parseMarkdownChartBlock(JSON.stringify(candidate));

  if (!verification.ok) {
    return {
      raw: JSON.stringify(candidate),
      error: verification.error.message,
      spec: null,
    };
  }

  return {
    raw: JSON.stringify(verification.spec),
    error: null,
    spec: verification.spec,
  };
}
