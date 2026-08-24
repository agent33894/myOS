import { describe, expect, it } from 'vitest';
import { parseChartDataInput } from '../../utils/chartDataImport';
import {
  buildChartPreview,
  createChartEditorFields,
  getChartValidationError,
  getNumericChartColumns,
} from './chartEditorModel';

describe('chart editor model', () => {
  it('round-trips a cartesian chart through editor fields', () => {
    const fields = createChartEditorFields({
      type: 'bar',
      title: 'Delivery',
      data: [{ month: 'Jan', shipped: 4 }],
      xKey: 'month',
      series: [{ key: 'shipped', label: 'Shipped' }],
      stacked: true,
      height: 360,
    });
    const preview = buildChartPreview(fields, parseChartDataInput(fields.dataInput));

    expect(preview.error).toBeNull();
    expect(preview.spec).toMatchObject({
      type: 'bar',
      title: 'Delivery',
      xKey: 'month',
      stacked: true,
      height: 360,
    });
  });

  it('round-trips pie mappings without cartesian fields', () => {
    const fields = createChartEditorFields({
      type: 'pie',
      title: 'Allocation',
      data: [{ team: 'Core', share: 70 }],
      nameKey: 'team',
      valueKey: 'share',
      height: 300,
    });
    const preview = buildChartPreview(fields, parseChartDataInput(fields.dataInput));

    expect(preview.spec).toMatchObject({ type: 'pie', nameKey: 'team', valueKey: 'share' });
    expect(fields.xKey).toBe('');
    expect(fields.seriesKeys).toEqual([]);
  });

  it('identifies numeric columns and returns stable validation messages', () => {
    const parsed = parseChartDataInput('label,value,note\nA,1,ok\nB,2,good');
    expect(getNumericChartColumns(parsed)).toEqual(['value']);

    const fields = createChartEditorFields();
    expect(getChartValidationError({ ...fields, chartTitle: '' }, parsed)).toBe('Chart title is required.');
    expect(getChartValidationError({ ...fields, xKey: 'label' }, parsed)).toBe(
      'Select at least one numeric series column.',
    );
  });

  it('normalizes invalid height input through the chart schema', () => {
    const parsed = parseChartDataInput('label,value\nA,1');
    const fields = {
      ...createChartEditorFields(),
      height: 'not-a-number',
      xKey: 'label',
      seriesKeys: ['value'],
    };
    expect(buildChartPreview(fields, parsed).spec?.height).toBe(300);
  });
});
