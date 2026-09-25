import { useEffect, useState, type KeyboardEvent } from 'react';
import { format } from 'date-fns';
import yaml from 'js-yaml';
import { Braces, CalendarDays, Plus, SlidersHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';
import { parseLocalDate } from '@shared/date';
import type { Properties, PropertiesPatch } from '@shared/spec';
import type { PanelProps } from '../../app/panels';
import { setProperties } from '../../data/gateway';
import { isConflict } from '../../data/ipc';
import { useNote } from '../../data/selectors';
import { Button, DatePicker, EmptyState, IconButton, Input, Pill, Property, SectionHeader, Switch, Textarea } from '../../ui';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const LIST_KEYS = new Set(['tags', 'aliases', 'cssclasses']);

/** Change only these keys (null removes one); every other line of the frontmatter stays as written. */
async function patch(path: string, change: PropertiesPatch): Promise<boolean> {
  try {
    const keys = Object.keys(change);
    await setProperties(path, change, keys.length === 1 ? `Change ${keys[0]} in ${path}` : undefined);
    return true;
  } catch (error) {
    toast.error(isConflict(error) ? 'This note changed on disk. Try again.' : error instanceof Error ? error.message : 'Could not change that property');
    return false;
  }
}

/** A typed value from what was typed in a new property's field. */
function typed(key: string, text: string): unknown {
  const value = text.trim();
  if (LIST_KEYS.has(key.toLowerCase())) return value.split(',').map((item) => item.trim()).filter(Boolean);
  if (value === 'true' || value === 'false') return value === 'true';
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  return value;
}

/** A text or number field that writes when you leave it or press Enter; Escape puts it back. */
function TextValue({ label, value, onCommit }: { label: string; value: string | number; onCommit: (next: string | number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    if (draft === String(value)) return;
    const number = Number(draft);
    onCommit(typeof value === 'number' && draft.trim() !== '' && Number.isFinite(number) ? number : draft);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur();
    if (event.key === 'Escape') {
      setDraft(String(value));
      event.currentTarget.blur();
    }
  };
  return (
    <Input
      variant="ghost"
      size="sm"
      aria-label={label}
      value={draft}
      inputMode={typeof value === 'number' ? 'decimal' : undefined}
      placeholder="Empty"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
    />
  );
}

/** A list as chips; type and press Enter (or a comma) to add one. */
function ListValue({ label, value, onCommit }: { label: string; value: unknown[]; onCommit: (next: unknown[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const items = draft.split(',').map((item) => item.trim()).filter(Boolean);
    setDraft('');
    if (items.length) onCommit([...value, ...items]);
  };
  return (
    <div className="flex flex-wrap items-center gap-1 px-1">
      {value.map((item, index) => (
        <Pill key={`${index}:${String(item)}`} onRemove={() => onCommit(value.filter((_, at) => at !== index))} removeLabel={`Remove ${String(item)}`}>
          {typeof item === 'object' ? JSON.stringify(item) : String(item)}
        </Pill>
      ))}
      <Input
        variant="ghost"
        size="sm"
        aria-label={`Add to ${label}`}
        placeholder="Add"
        value={draft}
        className="w-20 flex-1"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={add}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            add();
          }
        }}
      />
    </div>
  );
}

function Value({ name, value, onCommit }: { name: string; value: unknown; onCommit: (next: unknown) => void }) {
  if (typeof value === 'boolean') return <Switch aria-label={name} checked={value} onCheckedChange={onCommit} className="mx-1" />;
  if (Array.isArray(value)) return <ListValue label={name} value={value} onCommit={onCommit} />;
  if (typeof value === 'string' && DATE.test(value)) {
    return (
      <DatePicker value={parseLocalDate(value)} onChange={(date) => onCommit(date ? format(date, 'yyyy-MM-dd') : null)}>
        <Property icon={CalendarDays} label={name} className="font-mono">
          {value}
        </Property>
      </DatePicker>
    );
  }
  if (typeof value === 'string' || typeof value === 'number') return <TextValue label={name} value={value} onCommit={onCommit} />;
  if (value === null) return <TextValue label={name} value="" onCommit={onCommit} />;
  return <p className="break-words px-1 font-mono text-xs text-text-secondary">{JSON.stringify(value)}</p>;
}

/** Name and value for a new property. */
function AddProperty({ taken, onAdd, onDone }: { taken: string[]; onAdd: (key: string, value: unknown) => Promise<boolean>; onDone: () => void }) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const key = name.trim();
  const problem = !key ? null : taken.includes(key) ? 'This note already has that property.' : /[:#\n]/.test(key) || key.startsWith('-') ? 'Use letters, numbers, spaces, - or _.' : null;
  const submit = async () => {
    if (!key || problem) return;
    if (await onAdd(key, typed(key, value))) onDone();
  };
  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void submit();
    }
    if (event.key === 'Escape') onDone();
  };
  return (
    <div className="flex flex-col gap-2 rounded-md bg-raised p-2 shadow-raised">
      <Input size="sm" autoFocus aria-label="Property name" placeholder="Name" className="font-mono" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={keys} />
      <Input size="sm" aria-label="Property value" placeholder="Value" value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={keys} />
      {problem ? <p className="text-xs text-danger">{problem}</p> : null}
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" disabled={!key || Boolean(problem)} onClick={() => void submit()}>
          Add
        </Button>
      </div>
    </div>
  );
}

/** The properties as YAML. Applying writes only the keys whose values changed. */
function YamlEditor({ properties, onApply, onDone }: { properties: Properties; onApply: (change: PropertiesPatch) => Promise<boolean>; onDone: () => void }) {
  const [text, setText] = useState(() => (Object.keys(properties).length ? yaml.safeDump(properties, { schema: yaml.CORE_SCHEMA }) : ''));
  const [error, setError] = useState<string | null>(null);
  const apply = async () => {
    let next: unknown;
    try {
      next = yaml.safeLoad(text, { schema: yaml.CORE_SCHEMA }) ?? {};
    } catch (problem) {
      setError(problem instanceof Error ? problem.message.split('\n')[0] : 'This is not valid YAML.');
      return;
    }
    if (typeof next !== 'object' || Array.isArray(next)) {
      setError('Properties are a list of `name: value` lines.');
      return;
    }
    const after = next as Properties;
    const change: PropertiesPatch = {};
    for (const key of new Set([...Object.keys(properties), ...Object.keys(after)])) {
      if (JSON.stringify(properties[key]) !== JSON.stringify(after[key])) change[key] = key in after ? after[key] : null;
    }
    if (Object.keys(change).length === 0 || (await onApply(change))) onDone();
  };
  return (
    <div className="flex flex-col gap-2">
      <Textarea
        autosize
        spellCheck={false}
        aria-label="Properties as YAML"
        className="min-h-24 font-mono text-xs"
        value={text}
        aria-invalid={error ? true : undefined}
        onChange={(event) => {
          setText(event.target.value);
          setError(null);
        }}
      />
      {error ? <p className="text-xs text-danger">{error}</p> : <p className="text-xs text-text-tertiary">Only the properties you change are rewritten.</p>}
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" onClick={() => void apply()}>
          Apply
        </Button>
      </div>
    </div>
  );
}

/**
 * The note's frontmatter, key by key, with an editor for each kind of value:
 * text and numbers, lists, dates, and yes/no. Each change rewrites only that
 * key's lines. Power users can edit the YAML itself.
 */
export function PropertiesPanel({ path }: PanelProps) {
  const note = useNote(path);
  const [adding, setAdding] = useState(false);
  const [asYaml, setAsYaml] = useState(false);
  useEffect(() => {
    setAdding(false);
    setAsYaml(false);
  }, [path]);

  if (!path || !note) return <EmptyState icon={SlidersHorizontal} title="No note open" description="Open a note to see its properties." />;
  if (note.propertiesError) {
    return <EmptyState icon={SlidersHorizontal} title="Properties can’t be read" description="The frontmatter isn’t valid YAML. Fix it in source mode (⌘E)." />;
  }

  const entries = Object.entries(note.properties);
  const change = (key: string, value: unknown) => patch(path, { [key]: value });
  const addButton = (
    <Button size="sm" variant="ghost" leadingIcon={Plus} onClick={() => setAdding(true)}>
      Add property
    </Button>
  );

  return (
    <div className="flex flex-col gap-2 py-2">
      <SectionHeader
        title="Properties"
        count={entries.length || undefined}
        as="h3"
        className="px-1"
        action={<IconButton icon={Braces} label={asYaml ? 'Edit one by one' : 'Edit as YAML'} size="sm" onClick={() => setAsYaml((on) => !on)} />}
      />
      {asYaml ? (
        <YamlEditor key={note.rev} properties={note.properties} onApply={(next) => patch(path, next)} onDone={() => setAsYaml(false)} />
      ) : (
        <>
          {entries.length === 0 && !adding ? <p className="px-1 text-sm text-text-tertiary">No properties. Add one to start a frontmatter block.</p> : null}
          <dl className="flex flex-col gap-1">
            {entries.map(([key, value]) => (
              <div key={key} className="group/prop flex flex-col rounded-md py-1 hover:bg-text/5">
                <dt className="flex items-center justify-between px-1">
                  <span className="truncate font-mono text-xs text-text-tertiary">{key}</span>
                  <IconButton
                    icon={X}
                    label={`Remove ${key}`}
                    size="sm"
                    className="size-6 opacity-0 focus-visible:opacity-100 group-hover/prop:opacity-100"
                    onClick={() => void change(key, null)}
                  />
                </dt>
                <dd className="min-w-0">
                  <Value name={key} value={value} onCommit={(next) => void change(key, next)} />
                </dd>
              </div>
            ))}
          </dl>
          {adding ? <AddProperty taken={entries.map(([key]) => key)} onAdd={change} onDone={() => setAdding(false)} /> : <div>{addButton}</div>}
        </>
      )}
    </div>
  );
}
