import { attempt, fail, isFiniteNumber, isRecord, jsonObject, text, toJson, type BlockModel } from '../model';

export interface Metric {
  title: string;
  value: string | number;
  unit?: string;
  /** Change since the comparison period; positive is shown as good. */
  delta?: number;
  deltaLabel?: string;
  target?: number;
}

export interface Kpi {
  title?: string;
  items: Metric[];
}

function optionalNumber(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (!isFiniteNumber(value)) fail(`${label} must be a number.`);
  return value;
}

function parseMetric(entry: unknown, index: number): Metric {
  const label = `Metric ${index + 1}`;
  if (!isRecord(entry)) fail(`${label} must be an object.`);
  const title = text(entry.title);
  if (!title) fail(`${label} needs a name.`);
  const value = isFiniteNumber(entry.value) ? entry.value : text(entry.value);
  if (value === undefined) fail(`${title} needs a value.`);
  return {
    title,
    value,
    unit: text(entry.unit),
    delta: optionalNumber(entry.delta, `${title}’s change`),
    deltaLabel: text(entry.deltaLabel),
    target: optionalNumber(entry.target, `${title}’s target`),
  };
}

export const kpiModel: BlockModel<Kpi> = {
  parse: (raw) =>
    attempt(() => {
      const source = jsonObject(raw);
      // A lone metric object is accepted as a one-item block.
      const entries = Array.isArray(source.items) ? source.items : [source];
      if (!entries.length) fail('Add at least one metric.');
      return { title: text(source.title), items: entries.map(parseMetric) };
    }),
  serialize: ({ title, items }) => toJson({ title, items }),
};

export const newKpi = (): Kpi => ({
  items: [
    { title: 'Revenue', value: '$12.4k', delta: 8, deltaLabel: 'vs last month' },
    { title: 'Active users', value: 1284, delta: -3, deltaLabel: 'vs last month' },
    { title: 'NPS', value: 62, target: 70 },
  ],
});

/** Reads what the user typed into a value field: plain numbers are stored as numbers, anything else ("$12.4k", "1.") as text. */
export function metricValue(input: string): string | number {
  const number = Number(input);
  return input !== '' && String(number) === input ? number : input;
}
