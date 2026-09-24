import { describe, expect, it } from 'vitest';
import { chartModel } from './model';

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

});
