import { columnsOf, type Chart } from './model';

// The chart editor shows data as comma-separated text: the first column is the
// label, every other column is a plotted value. Pasting from a spreadsheet
// (tab-separated) works too.

type Row = Record<string, unknown>;

function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = '';
    } else current += char;
  }
  cells.push(current.trim());
  return cells;
}

const cellValue = (cell: string): unknown => (/^-?\d+(\.\d+)?$/.test(cell) ? Number(cell) : cell);

const quote = (value: unknown) => {
  const cell = value === undefined || value === null ? '' : String(value);
  return /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
};

export function toTable(chart: Chart): string {
  const columns = columnsOf(chart);
  const rows = chart.data.map((row) => columns.map((column) => quote(row[column])).join(', '));
  return [columns.join(', '), ...rows].join('\n');
}

type TableResult = { ok: true; chart: Chart } | { ok: false; error: string };

/** Apply edited table text to a chart, keeping series names and colors for columns that remain. */
export function fromTable(input: string, chart: Chart): TableResult {
  const lines = input.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return { ok: false, error: 'Add a header row and at least one row of data.' };
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const columns = splitLine(lines[0], delimiter);
  if (columns.length < 2 || columns.some((column) => !column)) {
    return { ok: false, error: 'The header row needs a label column and at least one value column.' };
  }
  if (new Set(columns).size !== columns.length) return { ok: false, error: 'Column names must be different.' };

  const data: Row[] = lines.slice(1).map((line) => {
    const cells = splitLine(line, delimiter);
    return Object.fromEntries(columns.map((column, index) => [column, cellValue(cells[index] ?? '')]));
  });
  const [label, ...values] = columns;

  if (chart.type === 'pie') return { ok: true, chart: { ...chart, data, nameKey: label, valueKey: values[0] } };
  const series = values.map((key) => chart.series.find((entry) => entry.key === key) ?? { key });
  return { ok: true, chart: { ...chart, data, xKey: label, series } };
}
