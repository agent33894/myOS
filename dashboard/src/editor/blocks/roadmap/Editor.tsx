import { format, parseISO } from 'date-fns';
import { CalendarDays, Plus, Trash2 } from 'lucide-react';
import { Button, DatePicker, Field, IconButton, Input, Select, SelectItem } from '../../../ui';
import { nextId, ROADMAP_STATUSES, type Roadmap, type RoadmapItem, type RoadmapLane } from './model';
import { STATUS } from './View';

const NO_LANE = 'none';

function DateButton({ label, value, onChange }: { label: string; value?: string; onChange: (value?: string) => void }) {
  return (
    <DatePicker value={value ? parseISO(value) : null} onChange={(date) => onChange(date ? format(date, 'yyyy-MM-dd') : undefined)}>
      <Button size="sm" variant="secondary" leadingIcon={CalendarDays} aria-label={`${label}: ${value ?? 'not set'}`} className="min-w-0 flex-1 justify-start">
        {value ? format(parseISO(value), 'MMM d') : <span className="text-text-tertiary">{label}</span>}
      </Button>
    </DatePicker>
  );
}

function ItemFields({ item, lanes, onChange, onRemove }: {
  item: RoadmapItem;
  lanes: RoadmapLane[];
  onChange: (next: RoadmapItem) => void;
  onRemove?: () => void;
}) {
  const set = (patch: Partial<RoadmapItem>) => onChange({ ...item, ...patch });
  const name = item.title || 'item';
  return (
    <div className="flex items-start gap-2 rounded-md bg-raised p-3 shadow-raised">
      <div className="grid flex-1 grid-cols-6 gap-2">
        <Input className="col-span-4" size="sm" aria-label="Item title" placeholder="Title" value={item.title} onChange={(event) => set({ title: event.target.value })} />
        <Input className="col-span-2" size="sm" aria-label={`${name} owner`} placeholder="Owner" value={item.owner ?? ''} onChange={(event) => set({ owner: event.target.value })} />
        <div className="col-span-2">
          <Select size="sm" aria-label={`${name} status`} value={item.status} onValueChange={(status) => set({ status: status as RoadmapItem['status'] })}>
            {ROADMAP_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS[status].label}
              </SelectItem>
            ))}
          </Select>
        </div>
        <div className="col-span-2">
          <Select size="sm" aria-label={`${name} lane`} value={item.lane ?? NO_LANE} onValueChange={(lane) => set({ lane: lane === NO_LANE ? undefined : lane })}>
            <SelectItem value={NO_LANE}>No lane</SelectItem>
            {lanes.map((lane) => (
              <SelectItem key={lane.id} value={lane.id}>
                {lane.label || lane.id}
              </SelectItem>
            ))}
          </Select>
        </div>
        <div className="col-span-2 flex gap-2">
          <DateButton label="Start" value={item.start} onChange={(start) => set({ start })} />
          <DateButton label="Target" value={item.target} onChange={(target) => set({ target })} />
        </div>
      </div>
      {onRemove ? <IconButton icon={Trash2} label={`Remove ${name}`} size="sm" onClick={onRemove} /> : null}
    </div>
  );
}

export default function RoadmapEditor({ value, onChange }: { value: Roadmap; onChange: (next: Roadmap) => void }) {
  const lanes = value.lanes ?? [];
  const setLanes = (next: RoadmapLane[]) => onChange({ ...value, lanes: next.length ? next : undefined });
  const setItem = (index: number, next: RoadmapItem) => onChange({ ...value, items: value.items.map((item, at) => (at === index ? next : item)) });

  const removeLane = (id: string) =>
    onChange({
      ...value,
      lanes: lanes.length > 1 ? lanes.filter((lane) => lane.id !== id) : undefined,
      items: value.items.map((item) => (item.lane === id ? { ...item, lane: undefined } : item)),
    });

  const removeItem = (id: string) =>
    onChange({
      ...value,
      items: value.items
        .filter((item) => item.id !== id)
        .map((item) => (item.dependsOn?.includes(id) ? { ...item, dependsOn: item.dependsOn.filter((dependency) => dependency !== id) } : item)),
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Title">
          <Input value={value.title ?? ''} placeholder="Roadmap" onChange={(event) => onChange({ ...value, title: event.target.value })} />
        </Field>
        <Field label="Timeframe">
          <Input value={value.timeframe ?? ''} placeholder="Q3 2026" onChange={(event) => onChange({ ...value, timeframe: event.target.value })} />
        </Field>
      </div>

      <div className="text-sm font-medium text-text-secondary">Lanes</div>
      <div className="flex flex-wrap gap-2">
        {lanes.map((lane, index) => (
          <div key={lane.id} className="flex items-center gap-1">
            <Input
              size="sm"
              className="w-36"
              aria-label="Lane name"
              value={lane.label}
              onChange={(event) => setLanes(lanes.map((entry, at) => (at === index ? { ...entry, label: event.target.value } : entry)))}
            />
            <IconButton icon={Trash2} label={`Remove ${lane.label || 'lane'}`} size="sm" onClick={() => removeLane(lane.id)} />
          </div>
        ))}
        <Button variant="ghost" size="sm" leadingIcon={Plus} onClick={() => setLanes([...lanes, { id: nextId('lane', lanes), label: 'New lane' }])}>
          Add lane
        </Button>
      </div>

      <div className="text-sm font-medium text-text-secondary">Items</div>
      {value.items.map((item, index) => (
        <ItemFields
          key={item.id}
          item={item}
          lanes={lanes}
          onChange={(next) => setItem(index, next)}
          onRemove={value.items.length > 1 ? () => removeItem(item.id) : undefined}
        />
      ))}
      <div>
        <Button
          variant="ghost"
          size="sm"
          leadingIcon={Plus}
          onClick={() => onChange({ ...value, items: [...value.items, { id: nextId('item', value.items), title: '', status: 'planned', lane: lanes[0]?.id }] })}
        >
          Add item
        </Button>
      </div>
    </div>
  );
}
