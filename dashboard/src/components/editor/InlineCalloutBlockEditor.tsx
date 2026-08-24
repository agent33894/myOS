import { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  parseMarkdownCalloutBlock,
  SUPPORTED_CALLOUT_TONES,
  type MarkdownCalloutTone,
} from '../../utils/richBlocks';
import MarkdownCalloutBlock from '../markdown/MarkdownCalloutBlock';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface InlineCalloutBlockEditorProps {
  raw: string;
  onApplyRaw: (nextRaw: string) => void;
  onRemove?: () => void;
}

const DEFAULT_STATE = {
  tone: 'info' as MarkdownCalloutTone,
  title: 'Important Context',
  body: '',
  itemsText: '',
};

type SurfaceMode = 'preview' | 'edit';

export default function InlineCalloutBlockEditor({ raw, onApplyRaw, onRemove }: InlineCalloutBlockEditorProps) {
  const [tone, setTone] = useState<MarkdownCalloutTone>(DEFAULT_STATE.tone);
  const [title, setTitle] = useState(DEFAULT_STATE.title);
  const [body, setBody] = useState(DEFAULT_STATE.body);
  const [itemsText, setItemsText] = useState(DEFAULT_STATE.itemsText);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>('preview');
  const initializedSignatureRef = useRef<string | null>(null);

  const parsedRaw = useMemo(() => parseMarkdownCalloutBlock(raw), [raw]);
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
      setTone(DEFAULT_STATE.tone);
      setTitle(DEFAULT_STATE.title);
      setBody(DEFAULT_STATE.body);
      setItemsText(DEFAULT_STATE.itemsText);
      return;
    }

    setTone(parsedRaw.spec.tone);
    setTitle(parsedRaw.spec.title);
    setBody(parsedRaw.spec.body || '');
    setItemsText((parsedRaw.spec.items || []).join('\n'));
  }, [parsedRaw, rawSignature]);

  const validation = useMemo(() => {
    const normalizedTitle = title.trim();
    const normalizedBody = body.trim();
    const normalizedItems = itemsText
      .split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean);

    const candidate = {
      tone,
      title: normalizedTitle,
      body: normalizedBody || undefined,
      items: normalizedItems.length > 0 ? normalizedItems : undefined,
    };

    const parsed = parseMarkdownCalloutBlock(JSON.stringify(candidate));
    if (!parsed.ok) {
      return {
        ok: false as const,
        error: parsed.error.message,
        previewRaw: null as string | null,
      };
    }

    return {
      ok: true as const,
      spec: parsed.spec,
      previewRaw: JSON.stringify(parsed.spec),
    };
  }, [body, itemsText, title, tone]);

  const handleApply = () => {
    setSubmitError(null);
    if (!validation.ok) {
      setSubmitError(validation.error);
      return;
    }
    onApplyRaw(JSON.stringify(validation.spec, null, 2));
    setSurfaceMode('preview');
  };

  const previewRaw = validation.previewRaw || raw;

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
              aria-label="Remove callout block"
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
        <MarkdownCalloutBlock raw={previewRaw} />
      </div>

      {surfaceMode === 'edit' ? (
        <div className="mt-3 space-y-3 border-t border-border/40 pt-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="ed-label mb-1 block">Tone</label>
              <Select value={tone} onValueChange={(value) => setTone(value as MarkdownCalloutTone)}>
                <SelectTrigger className="w-full border-border bg-transparent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CALLOUT_TONES.map((toneValue) => (
                    <SelectItem key={toneValue} value={toneValue}>
                      {toneValue}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="ed-label mb-1 block">Title</label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Important Context"
              />
            </div>
          </div>

          <div>
            <label className="ed-label mb-1 block">Body</label>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="min-h-[70px] w-full border border-border bg-background/40 p-3 text-sm text-foreground focus:outline-none focus-visible:border-[rgb(var(--accent-color))] focus-visible:ring-1 focus-visible:ring-[rgb(var(--accent-color))]"
              placeholder="Summarize the key takeaway in one sentence."
            />
          </div>

          <div>
            <label className="ed-label mb-1 block">Items (one per line)</label>
            <textarea
              value={itemsText}
              onChange={(event) => setItemsText(event.target.value)}
              className="min-h-[90px] w-full border border-border bg-background/40 p-3 text-sm text-foreground focus:outline-none focus-visible:border-[rgb(var(--accent-color))] focus-visible:ring-1 focus-visible:ring-[rgb(var(--accent-color))]"
              placeholder={'Action item one\nAction item two'}
            />
          </div>

          {!validation.ok || submitError ? (
            <div className="text-xs text-[hsl(var(--ed-error))]">
              {submitError || validation.error}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={handleApply} disabled={!validation.ok}>
              Apply Callout Changes
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
