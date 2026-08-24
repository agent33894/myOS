import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { parseMarkdownKpiBlock, type MarkdownKpiItem } from '../../utils/richBlocks';
import MarkdownKpiBlock from '../markdown/MarkdownKpiBlock';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface InlineKpiBlockEditorProps {
  raw: string;
  onApplyRaw: (nextRaw: string) => void;
  onRemove?: () => void;
}

interface KpiItemDraft {
  id: string;
  title: string;
  value: string;
  unit: string;
  delta: string;
  deltaLabel: string;
  target: string;
}

type SurfaceMode = 'preview' | 'edit';

const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;

function createDraftId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function createDefaultItem(): KpiItemDraft {
  return {
    id: createDraftId(),
    title: 'Metric',
    value: '0',
    unit: '',
    delta: '',
    deltaLabel: '',
    target: '',
  };
}

function toDraft(item: MarkdownKpiItem): KpiItemDraft {
  return {
    id: createDraftId(),
    title: item.title,
    value: typeof item.value === 'number' ? String(item.value) : item.value,
    unit: item.unit || '',
    delta: item.delta !== undefined ? String(item.delta) : '',
    deltaLabel: item.deltaLabel || '',
    target: item.target !== undefined ? String(item.target) : '',
  };
}

function parseNumericOptional(rawValue: string, fieldName: string): { ok: true; value?: number } | { ok: false; error: string } {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { ok: true, value: undefined };
  }
  if (!NUMBER_PATTERN.test(trimmed)) {
    return { ok: false, error: `${fieldName} must be a valid number when provided.` };
  }
  return { ok: true, value: Number(trimmed) };
}

export default function InlineKpiBlockEditor({ raw, onApplyRaw, onRemove }: InlineKpiBlockEditorProps) {
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<KpiItemDraft[]>([createDefaultItem()]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>('preview');
  const initializedSignatureRef = useRef<string | null>(null);

  const parsedRaw = useMemo(() => parseMarkdownKpiBlock(raw), [raw]);
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
      setItems([createDefaultItem()]);
      return;
    }

    setTitle(parsedRaw.spec.title || '');
    setItems(parsedRaw.spec.items.map(toDraft));
  }, [parsedRaw, rawSignature]);

  const validation = useMemo(() => {
    if (items.length === 0) {
      return { ok: false as const, error: 'KPI block requires at least one item.' };
    }

    const normalizedItems: MarkdownKpiItem[] = [];
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const normalizedTitle = item.title.trim();
      if (!normalizedTitle) {
        return { ok: false as const, error: `Item ${index + 1}: title is required.` };
      }

      const rawValue = item.value.trim();
      if (!rawValue) {
        return { ok: false as const, error: `Item ${index + 1}: value is required.` };
      }

      const parsedDelta = parseNumericOptional(item.delta, `Item ${index + 1}: delta`);
      if (!parsedDelta.ok) return { ok: false as const, error: parsedDelta.error };
      const parsedTarget = parseNumericOptional(item.target, `Item ${index + 1}: target`);
      if (!parsedTarget.ok) return { ok: false as const, error: parsedTarget.error };

      const normalizedValue = NUMBER_PATTERN.test(rawValue) ? Number(rawValue) : rawValue;
      normalizedItems.push({
        title: normalizedTitle,
        value: normalizedValue,
        unit: item.unit.trim() || undefined,
        delta: parsedDelta.value,
        deltaLabel: item.deltaLabel.trim() || undefined,
        target: parsedTarget.value,
      });
    }

    const candidate = {
      title: title.trim() || undefined,
      items: normalizedItems,
    };

    const parsed = parseMarkdownKpiBlock(JSON.stringify(candidate));
    if (!parsed.ok) {
      return { ok: false as const, error: parsed.error.message };
    }

    return {
      ok: true as const,
      spec: parsed.spec,
      previewRaw: JSON.stringify(parsed.spec),
    };
  }, [items, title]);

  const updateItem = (id: string, field: keyof Omit<KpiItemDraft, 'id'>, value: string) => {
    setItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (id: string) => {
    setItems((previous) => {
      if (previous.length === 1) {
        return previous;
      }
      return previous.filter((item) => item.id !== id);
    });
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

  const previewRaw = validation.ok ? validation.previewRaw : raw;

  return (
    <div className="group/rich-block my-1 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="w-7">
          {onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 px-0 text-[hsl(var(--ed-error))] opacity-0 pointer-events-none transition-opacity group-hover/rich-block:opacity-100 group-hover/rich-block:pointer-events-auto group-focus-within/rich-block:opacity-100 group-focus-within/rich-block:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto hover:bg-[hsl(var(--ed-error)/0.12)] hover:text-[hsl(var(--ed-error))]"
              onClick={onRemove}
              aria-label="Remove KPI block"
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

      <div className="[&>*]:!my-0">
        <MarkdownKpiBlock raw={previewRaw} />
      </div>

      {surfaceMode === 'edit' ? (
        <div className="mt-3 space-y-3 border-t border-border/40 pt-3">
          <div>
            <label className="ed-label mb-1 block">KPI Block Title (optional)</label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Release Metrics"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="ed-label">Items</div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setItems((previous) => [...previous, createDefaultItem()])}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Item
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={item.id} className="space-y-2 border border-border/50 bg-background/35 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Item {index + 1}</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <Input
                    value={item.title}
                    onChange={(event) => updateItem(item.id, 'title', event.target.value)}
                    placeholder="Metric name"
                  />
                  <Input
                    value={item.value}
                    onChange={(event) => updateItem(item.id, 'value', event.target.value)}
                    placeholder="Value"
                  />
                  <Input
                    value={item.unit}
                    onChange={(event) => updateItem(item.id, 'unit', event.target.value)}
                    placeholder="Unit (optional)"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <Input
                    value={item.delta}
                    onChange={(event) => updateItem(item.id, 'delta', event.target.value)}
                    placeholder="Delta (optional)"
                  />
                  <Input
                    value={item.deltaLabel}
                    onChange={(event) => updateItem(item.id, 'deltaLabel', event.target.value)}
                    placeholder="Delta label (optional)"
                  />
                  <Input
                    value={item.target}
                    onChange={(event) => updateItem(item.id, 'target', event.target.value)}
                    placeholder="Target (optional)"
                  />
                </div>
              </div>
            ))}
          </div>

          {!validation.ok || submitError ? (
            <div className="text-xs text-[hsl(var(--ed-error))]">
              {submitError || validation.error}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={handleApply} disabled={!validation.ok}>
              Apply KPI Changes
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
