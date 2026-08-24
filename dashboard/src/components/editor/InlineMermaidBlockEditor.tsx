import { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { parseMarkdownMermaidBlock } from '../../utils/richBlocks';
import MarkdownMermaidBlock from '../markdown/MarkdownMermaidBlock';
import { Button } from '../ui/button';

interface InlineMermaidBlockEditorProps {
  raw: string;
  onApplyRaw: (nextRaw: string) => void;
  onRemove?: () => void;
}

type SurfaceMode = 'preview' | 'edit';

const MERMAID_PLACEHOLDER = `flowchart TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Action]
  B -->|No| D[Alternative]`;

export default function InlineMermaidBlockEditor({ raw, onApplyRaw, onRemove }: InlineMermaidBlockEditorProps) {
  const [source, setSource] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>('preview');
  const initializedSignatureRef = useRef<string | null>(null);

  const parsedRaw = useMemo(() => parseMarkdownMermaidBlock(raw), [raw]);
  const rawSignature = useMemo(
    () => (parsedRaw.ok ? `ok:${parsedRaw.spec.source}` : `invalid:${raw}`),
    [parsedRaw, raw]
  );

  useEffect(() => {
    if (initializedSignatureRef.current === rawSignature) {
      return;
    }
    initializedSignatureRef.current = rawSignature;
    setSubmitError(null);
    setSurfaceMode('preview');
    setSource(parsedRaw.ok ? parsedRaw.spec.source : MERMAID_PLACEHOLDER);
  }, [parsedRaw, rawSignature]);

  const validation = useMemo(() => {
    const parsed = parseMarkdownMermaidBlock(source);
    if (!parsed.ok) {
      return {
        ok: false as const,
        error: parsed.error.message,
      };
    }

    return {
      ok: true as const,
      source: parsed.spec.source,
    };
  }, [source]);

  const handleApply = () => {
    setSubmitError(null);
    if (!validation.ok) {
      setSubmitError(validation.error);
      return;
    }
    onApplyRaw(validation.source);
    setSurfaceMode('preview');
  };

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
              aria-label="Remove mermaid block"
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
        <MarkdownMermaidBlock raw={validation.ok ? validation.source : raw} />
      </div>

      {surfaceMode === 'edit' ? (
        <div className="mt-3 space-y-3 border-t border-border/40 pt-3">
          <div>
            <label className="ed-label mb-1 block">Mermaid Source</label>
            <textarea
              value={source}
              onChange={(event) => setSource(event.target.value)}
              className="min-h-[140px] w-full border border-border bg-background/40 p-3 font-mono text-xs text-foreground focus:outline-none focus-visible:border-[rgb(var(--accent-color))] focus-visible:ring-1 focus-visible:ring-[rgb(var(--accent-color))]"
              placeholder={MERMAID_PLACEHOLDER}
            />
          </div>

          {!validation.ok || submitError ? (
            <div className="text-xs text-[hsl(var(--ed-error))]">
              {submitError || validation.error}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={handleApply} disabled={!validation.ok}>
              Apply Mermaid Changes
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
