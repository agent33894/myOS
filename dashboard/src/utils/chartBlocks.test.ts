import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CHART_HEIGHT,
  MAX_CARTESIAN_POINTS,
  MAX_CHART_HEIGHT,
  MAX_PIE_SLICES,
  MIN_CHART_HEIGHT,
  parseMarkdownChartBlock,
} from './chartBlocks';

describe('parseMarkdownChartBlock', () => {
  it('parses a valid line chart spec', () => {
    const raw = JSON.stringify({
      type: 'line',
      title: 'Daily Activity',
      data: [
        { day: 'Mon', created: 4 },
        { day: 'Tue', created: 6 },
      ],
      xKey: 'day',
      series: [{ key: 'created', label: 'Artifacts Created', color: '#3366ff' }],
      xAxisFormat: 'date',
      thresholds: [{ value: 5, label: 'Target', color: '#22c55e' }],
    });

    const result = parseMarkdownChartBlock(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.spec.type).toBe('line');
    if (result.spec.type !== 'line') return;
    expect(result.spec.height).toBe(DEFAULT_CHART_HEIGHT);
    expect(result.spec.series[0].color).toBe('#3366ff');
    expect(result.spec.xAxisFormat).toBe('date');
    expect(result.spec.thresholds?.[0]?.label).toBe('Target');
  });

  it('parses a valid pie chart spec', () => {
    const raw = JSON.stringify({
      type: 'pie',
      title: 'Artifacts by Domain',
      data: [
        { domain: 'work', value: 12 },
        { domain: 'research', value: 6 },
      ],
      nameKey: 'domain',
      valueKey: 'value',
      height: 380,
    });

    const result = parseMarkdownChartBlock(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.spec.type).toBe('pie');
    expect(result.spec.height).toBe(380);
  });

  it('rejects invalid JSON payloads', () => {
    const result = parseMarkdownChartBlock('{');
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('invalid-json');
  });

  it('rejects unsupported chart types', () => {
    const raw = JSON.stringify({
      type: 'scatter',
      title: 'Scatter',
      data: [{ x: 1, y: 2 }],
      xKey: 'x',
      series: [{ key: 'y' }],
    });

    const result = parseMarkdownChartBlock(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('unsupported-chart-type');
  });

  it('rejects unsupported x-axis formats', () => {
    const raw = JSON.stringify({
      type: 'line',
      title: 'Unsupported Axis Format',
      data: [{ day: 'Mon', value: 2 }],
      xKey: 'day',
      series: [{ key: 'value' }],
      xAxisFormat: 'month',
    });

    const result = parseMarkdownChartBlock(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('xAxisFormat');
  });

  it('rejects cartesian charts with missing series', () => {
    const raw = JSON.stringify({
      type: 'bar',
      title: 'By Day',
      data: [{ day: 'Mon', count: 2 }],
      xKey: 'day',
      series: [],
    });

    const result = parseMarkdownChartBlock(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('series');
  });

  it('rejects non-finite numeric values', () => {
    const raw = JSON.stringify({
      type: 'area',
      title: 'Trend',
      data: [{ day: 'Mon', count: '4' }],
      xKey: 'day',
      series: [{ key: 'count' }],
    });

    const result = parseMarkdownChartBlock(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid-data');
  });

  it('rejects invalid threshold values', () => {
    const raw = JSON.stringify({
      type: 'line',
      title: 'Invalid Thresholds',
      data: [{ day: 'Mon', value: 4 }],
      xKey: 'day',
      series: [{ key: 'value' }],
      thresholds: [{ value: 'high' }],
    });

    const result = parseMarkdownChartBlock(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('thresholds');
  });

  it('rejects cartesian datasets above point cap', () => {
    const raw = JSON.stringify({
      type: 'line',
      title: 'Too many points',
      data: Array.from({ length: MAX_CARTESIAN_POINTS + 1 }, (_, index) => ({
        x: `p${index}`,
        y: index,
      })),
      xKey: 'x',
      series: [{ key: 'y' }],
    });

    const result = parseMarkdownChartBlock(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain(`${MAX_CARTESIAN_POINTS}`);
  });

  it('rejects pie datasets above slice cap', () => {
    const raw = JSON.stringify({
      type: 'pie',
      title: 'Too many slices',
      data: Array.from({ length: MAX_PIE_SLICES + 1 }, (_, index) => ({
        label: `slice-${index}`,
        value: index + 1,
      })),
      nameKey: 'label',
      valueKey: 'value',
    });

    const result = parseMarkdownChartBlock(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain(`${MAX_PIE_SLICES}`);
  });

  it('clamps chart heights to safe bounds', () => {
    const tooSmall = parseMarkdownChartBlock(
      JSON.stringify({
        type: 'line',
        title: 'Small',
        data: [{ x: 'a', y: 1 }],
        xKey: 'x',
        series: [{ key: 'y' }],
        height: 10,
      })
    );

    expect(tooSmall.ok).toBe(true);
    if (tooSmall.ok) {
      expect(tooSmall.spec.height).toBe(MIN_CHART_HEIGHT);
    }

    const tooLarge = parseMarkdownChartBlock(
      JSON.stringify({
        type: 'line',
        title: 'Large',
        data: [{ x: 'a', y: 1 }],
        xKey: 'x',
        series: [{ key: 'y' }],
        height: 9999,
      })
    );

    expect(tooLarge.ok).toBe(true);
    if (tooLarge.ok) {
      expect(tooLarge.spec.height).toBe(MAX_CHART_HEIGHT);
    }
  });
});
