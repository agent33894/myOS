import { Plus, Trash2 } from 'lucide-react';
import { Button, Field, IconButton, Input } from '../../../ui';
import { NumberInput } from '../NumberInput';
import { metricValue, type Kpi, type Metric } from './model';

function MetricFields({ metric, onChange, onRemove }: { metric: Metric; onChange: (next: Metric) => void; onRemove?: () => void }) {
  const set = (patch: Partial<Metric>) => onChange({ ...metric, ...patch });
  const name = metric.title || 'metric';
  return (
    <div className="flex items-start gap-2 rounded-md bg-raised p-3 shadow-raised">
      <div className="grid flex-1 grid-cols-6 gap-2">
        <Input className="col-span-3" size="sm" aria-label="Metric name" placeholder="Name" value={metric.title} onChange={(event) => set({ title: event.target.value })} />
        <Input className="col-span-2" size="sm" aria-label={`${name} value`} placeholder="Value" value={String(metric.value)} onChange={(event) => set({ value: metricValue(event.target.value) })} />
        <Input size="sm" aria-label={`${name} unit`} placeholder="Unit" value={metric.unit ?? ''} onChange={(event) => set({ unit: event.target.value })} />
        <NumberInput className="col-span-2" size="sm" aria-label={`${name} change`} placeholder="Change, e.g. 8" value={metric.delta} onValueChange={(delta) => set({ delta })} />
        <Input className="col-span-2" size="sm" aria-label={`${name} change label`} placeholder="vs last month" value={metric.deltaLabel ?? ''} onChange={(event) => set({ deltaLabel: event.target.value })} />
        <NumberInput className="col-span-2" size="sm" aria-label={`${name} target`} placeholder="Target" value={metric.target} onValueChange={(target) => set({ target })} />
      </div>
      {onRemove ? <IconButton icon={Trash2} label={`Remove ${name}`} size="sm" onClick={onRemove} /> : null}
    </div>
  );
}

export default function KpiEditor({ value, onChange }: { value: Kpi; onChange: (next: Kpi) => void }) {
  const setItem = (index: number, next: Metric) => onChange({ ...value, items: value.items.map((item, at) => (at === index ? next : item)) });
  return (
    <div className="flex flex-col gap-3">
      <Field label="Heading">
        <Input value={value.title ?? ''} placeholder="Optional" onChange={(event) => onChange({ ...value, title: event.target.value })} />
      </Field>
      {value.items.map((metric, index) => (
        <MetricFields
          key={index}
          metric={metric}
          onChange={(next) => setItem(index, next)}
          onRemove={value.items.length > 1 ? () => onChange({ ...value, items: value.items.filter((_, at) => at !== index) }) : undefined}
        />
      ))}
      <div>
        <Button variant="ghost" size="sm" leadingIcon={Plus} onClick={() => onChange({ ...value, items: [...value.items, { title: '', value: '' }] })}>
          Add metric
        </Button>
      </div>
    </div>
  );
}
