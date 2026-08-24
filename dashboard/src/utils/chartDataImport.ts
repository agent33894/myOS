import type { MarkdownChartSpec } from './chartBlocks';

type ChartDataImportFormat = 'json' | 'csv' | 'tsv';

interface ChartDataImportSuccess {
  ok: true;
  format: ChartDataImportFormat;
  data: Record<string, unknown>[];
  columns: string[];
}

interface ChartDataImportError {
  ok: false;
  message: string;
}

type ChartDataImportResult = ChartDataImportSuccess | ChartDataImportError;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toColumns(data: Record<string, unknown>[]): string[] {
  const seen = new Set<string>();
  for (const row of data) {
    for (const key of Object.keys(row)) {
      const trimmed = key.trim();
      if (!trimmed) continue;
      seen.add(trimmed);
    }
  }
  return [...seen];
}

function coercePrimitive(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}

function parseDelimitedLine(line: string, delimiter: ',' | '\t'): string[] {
  const output: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      output.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  output.push(current);
  return output.map((value) => value.trim());
}

function parseDelimitedData(raw: string): ChartDataImportResult {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return {
      ok: false,
      message: 'Provide at least one header row and one data row.',
    };
  }

  const delimiter: ',' | '\t' = lines[0].includes('\t') ? '\t' : ',';
  const headers = parseDelimitedLine(lines[0], delimiter);

  if (headers.length === 0 || headers.some((header) => !header)) {
    return {
      ok: false,
      message: 'Header row must contain non-empty column names.',
    };
  }

  const data: Record<string, unknown>[] = lines.slice(1).map((line) => {
    const values = parseDelimitedLine(line, delimiter);
    const row: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      row[header] = coercePrimitive(values[index] ?? '');
    });
    return row;
  });

  return {
    ok: true,
    format: delimiter === '\t' ? 'tsv' : 'csv',
    data,
    columns: headers,
  };
}

function parseJsonData(raw: string): ChartDataImportResult {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const source = Array.isArray(parsed)
      ? parsed
      : (isRecord(parsed) && Array.isArray(parsed.data) ? parsed.data : null);

    if (!source) {
      return {
        ok: false,
        message: 'JSON must be an array of objects or an object with a `data` array.',
      };
    }

    const data = source.map((row, index) => {
      if (!isRecord(row)) {
        throw new Error(`Row ${index + 1} must be an object.`);
      }
      return row;
    });

    const columns = toColumns(data);
    if (columns.length === 0) {
      return {
        ok: false,
        message: 'Parsed data has no usable columns.',
      };
    }

    return {
      ok: true,
      format: 'json',
      data,
      columns,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Invalid JSON input.',
    };
  }
}

export function parseChartDataInput(rawInput: string): ChartDataImportResult {
  const raw = rawInput.trim();
  if (!raw) {
    return {
      ok: false,
      message: 'Paste JSON, CSV, or TSV data to continue.',
    };
  }

  if (raw.startsWith('[') || raw.startsWith('{')) {
    const jsonResult = parseJsonData(raw);
    if (jsonResult.ok) return jsonResult;

    // If JSON fails and input still looks tabular, try delimited fallback.
    if (raw.includes('\n') && (raw.includes(',') || raw.includes('\t'))) {
      return parseDelimitedData(raw);
    }
    return jsonResult;
  }

  return parseDelimitedData(raw);
}

export function buildChartFence(spec: MarkdownChartSpec): string {
  return `\`\`\`chart\n${JSON.stringify(spec, null, 2)}\n\`\`\``;
}
