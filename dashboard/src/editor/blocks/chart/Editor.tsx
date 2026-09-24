import { useState } from 'react';
import { AreaChart, BarChart3, LineChart, PieChart } from 'lucide-react';
import { Field, Input, SegmentedControl, Switch, Textarea } from '../../../ui';
import { withType, type Chart, type ChartType } from './model';
import { fromTable, toTable } from './table';

const TYPES = [
  { value: 'bar', label: 'Bar', icon: BarChart3 },
  { value: 'line', label: 'Line', icon: LineChart },
  { value: 'area', label: 'Area', icon: AreaChart },
  { value: 'pie', label: 'Pie', icon: PieChart },
] as const satisfies ReadonlyArray<{ value: ChartType; label: string; icon: unknown }>;

export default function ChartEditor({ value, onChange }: { value: Chart; onChange: (next: Chart) => void }) {
  // The table text is edited freely; it becomes chart data whenever it reads cleanly.
  const [table, setTable] = useState(() => toTable(value));
  const [tableError, setTableError] = useState<string | null>(null);

  const editTable = (text: string) => {
    setTable(text);
    const result = fromTable(text, value);
    setTableError(result.ok ? null : result.error);
    if (result.ok) onChange(result.chart);
  };

  const canStack = value.type !== 'pie' && value.type !== 'line' && value.series.length > 1;

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl aria-label="Chart type" size="sm" options={TYPES} value={value.type} onValueChange={(type) => onChange(withType(value, type))} />
      <Field label="Title">
        <Input value={value.title ?? ''} placeholder="Untitled chart" onChange={(event) => onChange({ ...value, title: event.target.value })} />
      </Field>
      <Field
        label="Data"
        error={tableError}
        hint={
          value.type === 'pie'
            ? 'First column is the label, second is the value. Paste from a spreadsheet to replace it.'
            : 'First column is the label; each other column becomes a series. Paste from a spreadsheet to replace it.'
        }
      >
        <Textarea autosize spellCheck={false} className="min-h-24 font-mono text-sm" value={table} onChange={(event) => editTable(event.target.value)} />
      </Field>
      {canStack ? (
        <label className="flex items-center gap-2 text-base text-text">
          <Switch checked={Boolean(value.stacked)} onCheckedChange={(stacked) => onChange({ ...value, stacked })} />
          Stack series
        </label>
      ) : null}
    </div>
  );
}
