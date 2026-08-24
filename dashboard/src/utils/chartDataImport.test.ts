import { describe, expect, it } from 'vitest';
import { buildChartFence, parseChartDataInput } from './chartDataImport';

describe('parseChartDataInput', () => {
  it('parses JSON arrays of objects', () => {
    const result = parseChartDataInput(
      JSON.stringify([
        { month: 'Jan', revenue: 10 },
        { month: 'Feb', revenue: 22 },
      ])
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.format).toBe('json');
    expect(result.columns).toEqual(['month', 'revenue']);
  });

  it('parses object payloads with a data array', () => {
    const result = parseChartDataInput(
      JSON.stringify({
        data: [
          { category: 'A', value: 1 },
          { category: 'B', value: 2 },
        ],
      })
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.columns).toEqual(['category', 'value']);
  });

  it('parses CSV and coerces numeric values', () => {
    const result = parseChartDataInput(
      `day,count\nMon,4\nTue,7`
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.format).toBe('csv');
    expect(result.data[0]?.count).toBe(4);
    expect(result.data[1]?.count).toBe(7);
  });

  it('parses TSV input', () => {
    const result = parseChartDataInput(
      `label\tvalue\nWork\t12\nResearch\t6`
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.format).toBe('tsv');
    expect(result.columns).toEqual(['label', 'value']);
  });

  it('returns error for empty input', () => {
    const result = parseChartDataInput('   ');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain('Paste JSON, CSV, or TSV');
  });
});

describe('buildChartFence', () => {
  it('returns markdown chart fence format', () => {
    const fence = buildChartFence({
      type: 'line',
      title: 'Trend',
      data: [{ x: 'a', y: 1 }],
      xKey: 'x',
      series: [{ key: 'y' }],
      height: 300,
    });

    expect(fence.startsWith('```chart')).toBe(true);
    expect(fence.endsWith('```')).toBe(true);
    expect(fence).toContain('"title": "Trend"');
  });
});
