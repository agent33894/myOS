import { describe, expect, it } from 'vitest';
import {
  buildChartInterpretation,
  formatXAxisValue,
  inferNumericFormat,
  inferXAxisValueFormat,
  truncateLabel,
} from './chartPresentation';

describe('chart presentation model', () => {
  it('infers percent and ordinary numeric formats', () => {
    expect(inferNumericFormat([0.25, 0.5, 0.75])).toBe('percent');
    expect(inferNumericFormat([1, 2, 3])).toBe('number');
  });

  it('infers and formats year, quarter, date, and category axes', () => {
    const base = { type: 'line' as const, title: 'Trend', series: [{ key: 'value' }], height: 300 };
    expect(inferXAxisValueFormat({ ...base, xKey: 'fiscal_year', data: [{ fiscal_year: 2025, value: 1 }] })).toBe('year');
    expect(inferXAxisValueFormat({ ...base, xKey: 'period', data: [{ period: '2026 Q2', value: 1 }] })).toBe('quarter');
    expect(inferXAxisValueFormat({ ...base, xKey: 'day', data: [{ day: '2026-08-12', value: 1 }] })).toBe('date');
    expect(inferXAxisValueFormat({ ...base, xKey: 'team', data: [{ team: 'Core', value: 1 }] })).toBe('category');
    expect(formatXAxisValue('Q2-2026', 'quarter', 'tick')).toBe('Q2 2026');
  });

  it('describes cartesian change and the largest pie slice', () => {
    expect(buildChartInterpretation({
      type: 'line',
      title: 'Throughput',
      data: [{ year: 2025, value: 4 }, { year: 2026, value: 7 }],
      xKey: 'year',
      series: [{ key: 'value', label: 'Items' }],
      height: 300,
    }).keyObservation).toContain('Items increases');
    expect(buildChartInterpretation({
      type: 'pie',
      title: 'Allocation',
      data: [{ team: 'Core', share: 70 }, { team: 'Other', share: 30 }],
      nameKey: 'team',
      valueKey: 'share',
      height: 300,
    }).keyObservation).toContain('Core');
  });

  it('truncates long labels without changing short labels', () => {
    expect(truncateLabel('Short')).toBe('Short');
    expect(truncateLabel('A very long category', 10)).toBe('A very lo…');
  });
});
