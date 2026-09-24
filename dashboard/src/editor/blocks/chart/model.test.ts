import { describe, expect, it } from 'vitest';
import { chartModel, newChart, withType, type CartesianChart } from './model';
import { fromTable, toTable } from './table';

const line = {
  type: 'line',
  title: 'Daily activity',
  data: [
    { day: 'Mon', created: 4, closed: 1 },
    { day: 'Tue', created: 6, closed: 3 },
  ],
  xKey: 'day',
  series: [{ key: 'created', label: 'Created', color: '#3366ff' }, { key: 'closed' }],
  thresholds: [{ value: 5, label: 'Target' }],
};

describe('chart model', () => {
  it('parses a spec and serializes it back to the same meaning', () => {
    const parsed = chartModel.parse(JSON.stringify(line));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(JSON.parse(chartModel.serialize(parsed.value))).toEqual(line);
  });

  it('parses pie charts and keeps an explicit height within bounds', () => {
    const parsed = chartModel.parse(JSON.stringify({ type: 'pie', data: [{ name: 'a', value: 2 }], nameKey: 'name', valueKey: 'value', height: 9000 }));
    expect(parsed.ok && parsed.value.type === 'pie' && parsed.value.height).toBe(520);
  });

  it('explains what is wrong with an invalid spec', () => {
    const cases: Array<[unknown, RegExp]> = [
      ['{', /valid JSON/],
      [{ type: 'scatter', data: [{}] }, /scatter/],
      [{ ...line, data: [{ day: 'Mon', created: 'lots', closed: 1 }] }, /created must be a number/],
      [{ ...line, series: [{ key: 'created', color: 'red' }] }, /hex color/],
    ];
    for (const [input, message] of cases) {
      const parsed = chartModel.parse(typeof input === 'string' ? input : JSON.stringify(input));
      expect(parsed.ok ? '' : parsed.error).toMatch(message);
    }
  });

  it('edits data as a table, keeping series names and colors', () => {
    const chart = chartModel.parse(JSON.stringify(line));
    if (!chart.ok) throw new Error(chart.error);
    expect(toTable(chart.value)).toBe('day, created, closed\nMon, 4, 1\nTue, 6, 3');

    const edited = fromTable('day\tcreated\nMon\t10\nWed\t2', chart.value);
    expect(edited.ok).toBe(true);
    if (!edited.ok) return;
    const next = edited.chart as CartesianChart;
    expect(next.data).toEqual([{ day: 'Mon', created: 10 }, { day: 'Wed', created: 2 }]);
    expect(next.series).toEqual([{ key: 'created', label: 'Created', color: '#3366ff' }]);
    expect(chartModel.parse(chartModel.serialize(next)).ok).toBe(true);
  });

  it('switches between cartesian and pie without losing the mapping', () => {
    const pie = withType(newChart(), 'pie');
    expect(pie).toMatchObject({ type: 'pie', nameKey: 'label', valueKey: 'value' });
    expect(withType(pie, 'bar')).toMatchObject({ type: 'bar', xKey: 'label', series: [{ key: 'value' }] });
    expect(chartModel.parse(chartModel.serialize(pie)).ok).toBe(true);
  });
});
