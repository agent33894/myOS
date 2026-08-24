import { format, isValid, parse } from 'date-fns';
import { Calendar as CalendarIcon, ChevronDown, Plus, Trash2, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import {
  parseMarkdownRoadmapBlock,
  SUPPORTED_ROADMAP_PRIORITIES,
  SUPPORTED_ROADMAP_STATUSES,
  type MarkdownRoadmapItem,
  type MarkdownRoadmapLane,
  type MarkdownRoadmapStatus,
} from '../../utils/richBlocks';
import MarkdownRoadmapBlock from '../markdown/MarkdownRoadmapBlock';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  validateRoadmapDraft,
  type RoadmapItemDraft,
  type RoadmapLaneDraft,
} from './roadmapEditorModel';

interface InlineRoadmapBlockEditorProps {
  raw: string;
  onApplyRaw: (nextRaw: string) => void;
  onRemove?: () => void;
}

type SurfaceMode = 'preview' | 'edit';

function createDraftId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function createDefaultItem(): RoadmapItemDraft {
  const seed = createDraftId().slice(0, 4);
  return {
    draftId: createDraftId(),
    id: `rm-${seed}`,
    title: 'New roadmap item',
    lane: '',
    status: 'planned',
    priority: '',
    start: '',
    target: '',
    owner: '',
    dependsOn: '',
    notes: '',
  };
}

function createDefaultLane(): RoadmapLaneDraft {
  const seed = createDraftId().slice(0, 4);
  return {
    draftId: createDraftId(),
    id: `lane-${seed}`,
    label: 'Lane',
  };
}

function laneToDraft(lane: MarkdownRoadmapLane): RoadmapLaneDraft {
  return {
    draftId: createDraftId(),
    id: lane.id,
    label: lane.label,
  };
}

function itemToDraft(item: MarkdownRoadmapItem): RoadmapItemDraft {
  return {
    draftId: createDraftId(),
    id: item.id,
    title: item.title,
    lane: item.lane || '',
    status: item.status,
    priority: item.priority || '',
    start: item.start || '',
    target: item.target || '',
    owner: item.owner || '',
    dependsOn: item.dependsOn?.join(', ') || '',
    notes: item.notes || '',
  };
}

/* ------------------------------------------------------------------ */
/*  Sentinel for Radix Select "no selection" options                    */
/* ------------------------------------------------------------------ */

const NONE_SENTINEL = '_none';

/* ------------------------------------------------------------------ */
/*  Inline date picker (Calendar + Popover)                            */
/* ------------------------------------------------------------------ */

function DateField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const dateObj = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  const validDate = dateObj && isValid(dateObj) ? dateObj : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 w-full items-center gap-2 border border-border bg-secondary/40 px-3 text-sm transition-colors',
            'hover:bg-secondary/70 focus:outline-none focus-visible:border-[rgb(var(--accent-color))] focus-visible:ring-1 focus-visible:ring-[rgb(var(--accent-color))]',
            validDate ? 'text-foreground' : 'text-muted-foreground font-light'
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {validDate ? format(validDate, 'MMM d, yyyy') : (placeholder || 'Select date')}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={validDate}
          onSelect={(date) => {
            onChange(date ? format(date, 'yyyy-MM-dd') : '');
            setOpen(false);
          }}
        />
        {value ? (
          <div className="border-t border-border/50 px-3 py-2">
            <button
              type="button"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              Clear date
            </button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline pill editing helpers                                        */
/* ------------------------------------------------------------------ */

/** A styled pill that opens a popover with selectable options. */
function OptionPill({
  value,
  options,
  onChange,
  pillClassName,
  emptyLabel,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
  pillClassName?: string;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const isEmpty = value === NONE_SENTINEL || !value;
  const display = isEmpty
    ? emptyLabel || 'Select'
    : options.find((o) => o.value === value)?.label || value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 text-2xs font-semibold uppercase tracking-[0.08em] transition-colors',
            isEmpty
              ? 'text-muted-foreground/50 hover:text-muted-foreground'
              : cn('hover:brightness-110', pillClassName || 'bg-secondary/50 text-muted-foreground')
          )}
        >
          {display}
          <ChevronDown className="h-3 w-3 opacity-40" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-[130px] p-1" align="start" sideOffset={4}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={cn(
              'flex w-full items-center px-3 py-1.5 text-xs transition-colors hover:bg-secondary/50',
              opt.value === value ? 'bg-secondary/40 font-medium text-foreground' : 'text-muted-foreground'
            )}
            onClick={() => {
              onChange(opt.value);
              setOpen(false);
            }}
          >
            {opt.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/** A date-range pill showing start–target. Opens popover with two calendars. */
function DateRangePill({
  start,
  target,
  onStartChange,
  onTargetChange,
}: {
  start: string;
  target: string;
  onStartChange: (v: string) => void;
  onTargetChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const startObj = start ? parse(start, 'yyyy-MM-dd', new Date()) : undefined;
  const targetObj = target ? parse(target, 'yyyy-MM-dd', new Date()) : undefined;
  const vs = startObj && isValid(startObj) ? startObj : undefined;
  const vt = targetObj && isValid(targetObj) ? targetObj : undefined;

  let label: string;
  if (vs && vt) {
    label =
      vs.getFullYear() === vt.getFullYear()
        ? `${format(vs, 'MMM d')}–${format(vt, 'MMM d, yyyy')}`
        : `${format(vs, 'MMM d, yyyy')}–${format(vt, 'MMM d, yyyy')}`;
  } else if (vs) {
    label = `${format(vs, 'MMM d, yyyy')}→`;
  } else if (vt) {
    label = `→${format(vt, 'MMM d, yyyy')}`;
  } else {
    label = '+ dates';
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-1 text-2xs tracking-[0.04em] transition-colors',
            vs || vt
              ? 'text-muted-foreground hover:text-foreground'
              : 'text-muted-foreground/50 hover:text-muted-foreground'
          )}
        >
          <CalendarIcon className="h-3 w-3" />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start" sideOffset={4}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="ed-label mb-1 block text-2xs">Start</label>
            <DateField value={start} onChange={onStartChange} placeholder="Start date" />
          </div>
          <div>
            <label className="ed-label mb-1 block text-2xs">Target</label>
            <DateField value={target} onChange={onTargetChange} placeholder="Target date" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** A text pill that opens a popover with an input field. */
function TextPill({
  value,
  onChange,
  placeholder,
  icon,
  className: extraClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (o) setDraft(value);
        if (!o && draft !== value) onChange(draft);
        setOpen(o);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 text-2xs tracking-[0.04em] text-muted-foreground transition-colors hover:text-foreground',
            extraClassName
          )}
        >
          {icon}
          {value || placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-2" align="start" sideOffset={4}>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="h-8 text-xs"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onChange(draft);
              setOpen(false);
            }
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

/** Inline-editable title text. Click to edit, Enter/blur to save. */
function InlineTitle({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          onChange(draft);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onChange(draft);
            setEditing(false);
          }
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="min-w-0 flex-1 border-b border-[rgb(var(--accent-color))] bg-transparent text-sm font-medium text-foreground outline-none"
      />
    );
  }

  return (
    <span
      className="min-w-0 flex-1 cursor-text truncate text-sm font-medium text-foreground transition-colors hover:text-[rgb(var(--accent-color))]"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
    >
      {value || 'Untitled'}
    </span>
  );
}

/** Inline lane tag with edit popover. */
function LaneTag({
  lane,
  onUpdate,
  onRemove,
}: {
  lane: RoadmapLaneDraft;
  onUpdate: (field: 'id' | 'label', value: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span className="inline-flex cursor-pointer items-center gap-1.5 border border-border/50 bg-secondary/25 px-3 py-1 text-2xs transition-colors hover:bg-secondary/40 active:scale-95">
          <span className="text-muted-foreground">{lane.id}:</span>
          <span className="text-foreground">{lane.label}</span>
          <button
            type="button"
            className="ml-0.5 text-muted-foreground transition-colors hover:text-[hsl(var(--ed-error))]"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            ×
          </button>
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-56 space-y-2 p-2" align="start" sideOffset={4}>
        <div>
          <label className="ed-label mb-1 block text-2xs">ID</label>
          <Input
            value={lane.id}
            onChange={(e) => onUpdate('id', e.target.value)}
            placeholder="lane-id"
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="ed-label mb-1 block text-2xs">Label</label>
          <Input
            value={lane.label}
            onChange={(e) => onUpdate('label', e.target.value)}
            placeholder="Lane label"
            className="h-8 text-xs"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/*  Status summary pill colors                                         */
/* ------------------------------------------------------------------ */

function statusPillClasses(status: MarkdownRoadmapStatus): string {
  switch (status) {
    case 'done':
      return 'bg-[hsl(var(--ed-success)/0.15)] text-[hsl(var(--ed-success))]';
    case 'blocked':
      return 'bg-[hsl(var(--ed-error)/0.15)] text-[hsl(var(--ed-error))]';
    case 'in-progress':
      return 'bg-[rgb(var(--accent-color)/0.15)] text-[rgb(var(--accent-color))]';
    case 'cancelled':
      return 'bg-muted text-muted-foreground';
    case 'planned':
    default:
      return 'bg-[hsl(var(--ed-warning)/0.15)] text-[hsl(var(--ed-warning))]';
  }
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function InlineRoadmapBlockEditor({ raw, onApplyRaw, onRemove }: InlineRoadmapBlockEditorProps) {
  const [title, setTitle] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [lanes, setLanes] = useState<RoadmapLaneDraft[]>([]);
  const [items, setItems] = useState<RoadmapItemDraft[]>([createDefaultItem()]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>('preview');
  const initializedSignatureRef = useRef<string | null>(null);

  /* Track which items show the notes textarea */
  const [notesVisible, setNotesVisible] = useState<Set<string>>(new Set());

  const showNotes = useCallback((draftId: string) => {
    setNotesVisible((previous) => {
      const next = new Set(previous);
      next.add(draftId);
      return next;
    });
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Parse + sync from raw prop                                       */
  /* ---------------------------------------------------------------- */

  const parsedRaw = useMemo(() => parseMarkdownRoadmapBlock(raw), [raw]);
  const rawSignature = useMemo(
    () => (parsedRaw.ok ? `ok:${JSON.stringify(parsedRaw.spec)}` : `invalid:${raw}`),
    [parsedRaw, raw]
  );

  useEffect(() => {
    if (initializedSignatureRef.current === rawSignature) {
      return;
    }
    initializedSignatureRef.current = rawSignature;
    setSubmitError(null);
    setSurfaceMode('preview');

    if (!parsedRaw.ok) {
      setTitle('');
      setTimeframe('');
      setLanes([]);
      setItems([createDefaultItem()]);
      return;
    }

    setTitle(parsedRaw.spec.title || '');
    setTimeframe(parsedRaw.spec.timeframe || '');
    setLanes((parsedRaw.spec.lanes || []).map(laneToDraft));
    setItems(parsedRaw.spec.items.map(itemToDraft));
    /* Reset notes visibility on raw change */
    setNotesVisible(new Set());
  }, [parsedRaw, rawSignature]);

  /* ---------------------------------------------------------------- */
  /*  Validation (unchanged logic)                                     */
  /* ---------------------------------------------------------------- */

  const validation = useMemo(
    () => validateRoadmapDraft({ title, timeframe, lanes, items }),
    [items, lanes, timeframe, title],
  );
  const validationError = validation.ok ? null : validation.error;

  /* ---------------------------------------------------------------- */
  /*  Mutators (unchanged)                                             */
  /* ---------------------------------------------------------------- */

  const updateLane = (draftId: string, field: keyof Omit<RoadmapLaneDraft, 'draftId'>, value: string) => {
    setLanes((previous) =>
      previous.map((lane) => (lane.draftId === draftId ? { ...lane, [field]: value } : lane))
    );
  };

  const updateItem = (draftId: string, field: keyof Omit<RoadmapItemDraft, 'draftId'>, value: string) => {
    setItems((previous) =>
      previous.map((item) => (item.draftId === draftId ? { ...item, [field]: value } : item))
    );
  };

  const handleApply = () => {
    setSubmitError(null);
    if (!validation.ok) {
      setSubmitError(validation.error);
      return;
    }
    onApplyRaw(JSON.stringify(validation.spec, null, 2));
    setSurfaceMode('preview');
  };

  /* ---------------------------------------------------------------- */
  /*  Option arrays for pills                                          */
  /* ---------------------------------------------------------------- */

  const statusOptions = useMemo(
    () => SUPPORTED_ROADMAP_STATUSES.map((s) => ({ value: s, label: s })),
    []
  );
  const priorityOptions = useMemo(
    () => [
      { value: NONE_SENTINEL, label: 'No priority' },
      ...SUPPORTED_ROADMAP_PRIORITIES.map((p) => ({ value: p, label: p })),
    ],
    []
  );
  const laneOptions = useMemo(
    () => [
      { value: NONE_SENTINEL, label: 'No lane' },
      ...lanes.map((l) => ({ value: l.id, label: l.label || l.id })),
    ],
    [lanes]
  );

  const previewRaw = validation.ok ? validation.previewRaw : raw;

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="group/rich-block my-1 space-y-2">
      {/* Top bar: delete + Preview/Edit toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="w-7">
          {onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 px-0 text-[hsl(var(--ed-error))] opacity-0 pointer-events-none transition-opacity group-hover/rich-block:opacity-100 group-hover/rich-block:pointer-events-auto group-focus-within/rich-block:opacity-100 group-focus-within/rich-block:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto hover:bg-[hsl(var(--ed-error)/0.12)] hover:text-[hsl(var(--ed-error))]"
              onClick={onRemove}
              aria-label="Remove roadmap block"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <div className="inline-flex border border-border/70 bg-background/85">
          <Button
            type="button"
            variant={surfaceMode === 'preview' ? 'outline' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => setSurfaceMode('preview')}
          >
            Preview
          </Button>
          <Button
            type="button"
            variant={surfaceMode === 'edit' ? 'outline' : 'ghost'}
            size="sm"
            className="h-7 border-l border-border px-2"
            onClick={() => setSurfaceMode('edit')}
          >
            Edit
          </Button>
        </div>
      </div>

      {/* Live preview */}
      <div className="[&>*]:!my-0">
        <MarkdownRoadmapBlock raw={previewRaw} />
      </div>

      {/* Compact edit surface */}
      {surfaceMode === 'edit' ? (
        <div className="mt-3 space-y-3 border-t border-border/40 pt-3">
          {/* Title + Timeframe: compact single row */}
          <div className="flex items-center gap-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Roadmap title"
              className="h-9 flex-1 text-sm"
            />
            <Input
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              placeholder="Timeframe"
              className="h-9 w-40 text-sm"
            />
          </div>

          {/* Lanes: inline tags */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="ed-label shrink-0 text-2xs">Lanes</span>
            {lanes.map((lane) => (
              <LaneTag
                key={lane.draftId}
                lane={lane}
                onUpdate={(field, value) => updateLane(lane.draftId, field, value)}
                onRemove={() =>
                  setLanes((prev) => prev.filter((l) => l.draftId !== lane.draftId))
                }
              />
            ))}
            <button
              type="button"
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-2xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setLanes((prev) => [...prev, createDefaultLane()])}
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>

          {/* Items: compact inline rows */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="ed-label text-2xs">Items</span>
              <button
                type="button"
                className="inline-flex items-center gap-0.5 text-2xs text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setItems((prev) => [...prev, createDefaultItem()])}
              >
                <Plus className="h-3 w-3" /> Add Item
              </button>
            </div>

            {items.map((item) => {
              const hasNotes = item.notes.trim().length > 0;
              const showNotesField = hasNotes || notesVisible.has(item.draftId);

              return (
                <div
                  key={item.draftId}
                  className="group/item border border-border/40 bg-background/25 px-4 py-3"
                >
                  {/* Row 1: Inline-editable title + delete */}
                  <div className="flex items-center gap-2">
                    <InlineTitle
                      value={item.title}
                      onChange={(v) => updateItem(item.draftId, 'title', v)}
                    />
                    {items.length > 1 ? (
                      <button
                        type="button"
                        className="shrink-0 text-[hsl(var(--ed-error))] opacity-0 transition-opacity group-hover/item:opacity-100"
                        onClick={() =>
                          setItems((prev) =>
                            prev.filter((entry) => entry.draftId !== item.draftId)
                          )
                        }
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    ) : null}
                  </div>

                  {/* Row 2: Property pills — grouped with separators */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    {/* ── Classification ── */}
                    <OptionPill
                      value={item.status}
                      options={statusOptions}
                      onChange={(v) => updateItem(item.draftId, 'status', v)}
                      pillClassName={statusPillClasses(item.status)}
                    />
                    <OptionPill
                      value={item.priority || NONE_SENTINEL}
                      options={priorityOptions}
                      onChange={(v) =>
                        updateItem(item.draftId, 'priority', v === NONE_SENTINEL ? '' : v)
                      }
                      pillClassName={
                        item.priority ? 'bg-secondary/50 text-muted-foreground' : undefined
                      }
                      emptyLabel="+ priority"
                    />
                    {lanes.length > 0 ? (
                      <OptionPill
                        value={item.lane || NONE_SENTINEL}
                        options={laneOptions}
                        onChange={(v) =>
                          updateItem(item.draftId, 'lane', v === NONE_SENTINEL ? '' : v)
                        }
                        pillClassName={
                          item.lane ? 'bg-secondary/50 text-muted-foreground' : undefined
                        }
                        emptyLabel="+ lane"
                      />
                    ) : null}

                    <span className="mx-0.5 h-4 w-px bg-border/40" />

                    {/* ── Timeline & people ── */}
                    <DateRangePill
                      start={item.start}
                      target={item.target}
                      onStartChange={(v) => updateItem(item.draftId, 'start', v)}
                      onTargetChange={(v) => updateItem(item.draftId, 'target', v)}
                    />
                    <TextPill
                      value={item.owner}
                      onChange={(v) => updateItem(item.draftId, 'owner', v)}
                      placeholder="+ owner"
                      icon={<UserRound className="h-3 w-3" />}
                    />

                    <span className="mx-0.5 h-4 w-px bg-border/40" />

                    {/* ── Identity & extras ── */}
                    <TextPill
                      value={item.id}
                      onChange={(v) => updateItem(item.draftId, 'id', v)}
                      placeholder="id"
                      className="opacity-40"
                    />
                    <TextPill
                      value={item.dependsOn}
                      onChange={(v) => updateItem(item.draftId, 'dependsOn', v)}
                      placeholder="+ deps"
                    />
                    {!showNotesField ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-0.5 px-1 py-0.5 text-2xs text-muted-foreground/40 transition-colors hover:text-muted-foreground"
                        onClick={() => showNotes(item.draftId)}
                      >
                        + notes
                      </button>
                    ) : null}
                  </div>

                  {/* Notes (compact, with hide button) */}
                  {showNotesField ? (
                    <div className="relative mt-2">
                      <textarea
                        value={item.notes}
                        onChange={(e) => updateItem(item.draftId, 'notes', e.target.value)}
                        className="min-h-[28px] w-full resize-y border border-border/30 bg-secondary/15 px-2 py-1 pr-8 text-2xs leading-relaxed text-foreground focus:outline-none focus-visible:border-[rgb(var(--accent-color))] placeholder:text-muted-foreground/50"
                        placeholder="Notes"
                        rows={1}
                      />
                      {!item.notes.trim() ? (
                        <button
                          type="button"
                          className="absolute right-1 top-1 text-muted-foreground/40 transition-colors hover:text-muted-foreground"
                          onClick={() =>
                            setNotesVisible((prev) => {
                              const next = new Set(prev);
                              next.delete(item.draftId);
                              return next;
                            })
                          }
                          aria-label="Hide notes"
                        >
                          <span className="text-2xs">×</span>
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Validation error + Apply */}
          {validationError || submitError ? (
            <div className="text-xs text-[hsl(var(--ed-error))]">
              {submitError || validationError}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleApply}
              disabled={!validation.ok}
            >
              Apply Roadmap Changes
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
