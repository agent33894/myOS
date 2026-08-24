import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { configureMermaid } from '../../utils/mermaid';
import { parseMarkdownMermaidBlock } from '../../utils/richBlocks';

interface MarkdownMermaidBlockProps {
  raw: string;
}

function MermaidErrorFallback({ message, raw }: { message: string; raw: string }) {
  return (
    <div className="my-5 border border-[hsl(var(--ed-warning))]/45 bg-card">
      <div className="flex items-center gap-2 border-b border-[hsl(var(--ed-warning))]/35 px-3 py-2 bg-[hsl(var(--ed-warning))]/8">
        <AlertTriangle className="h-4 w-4 text-[hsl(var(--ed-warning))]" />
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--ed-warning))]">
          Mermaid Block Warning
        </p>
      </div>
      <div className="px-3 py-3">
        <p className="mb-3 text-sm text-foreground">{message}</p>
        <pre className="overflow-x-auto border border-border/60 bg-secondary/50 p-3 text-xs">
          <code>{raw}</code>
        </pre>
      </div>
    </div>
  );
}

function MarkdownMermaidBlock({ raw }: MarkdownMermaidBlockProps) {
  const parsed = useMemo(() => parseMarkdownMermaidBlock(raw), [raw]);
  const source = parsed.ok ? parsed.spec.source : '';
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bindRef = useRef<((element: Element) => void) | null>(null);

  useEffect(() => {
    let active = true;
    setSvg(null);
    setError(null);
    bindRef.current = null;

    if (!parsed.ok) {
      setError(parsed.error.message);
      return () => {
        active = false;
      };
    }

    (async () => {
      const mermaid = await configureMermaid('dark');
      const id = `md-mermaid-${Math.random().toString(36).slice(2)}`;
      const rendered = await mermaid.render(id, source);
      if (!active) return;
      bindRef.current = rendered.bindFunctions ?? null;
      setSvg(rendered.svg);
    })().catch((renderError: unknown) => {
      if (!active) return;
      setError(renderError instanceof Error ? renderError.message : 'Mermaid render failed.');
    });

    return () => {
      active = false;
    };
  }, [parsed, source]);

  useEffect(() => {
    if (!svg || !bindRef.current || !containerRef.current) return;
    bindRef.current(containerRef.current);
  }, [svg]);

  if (error) {
    return <MermaidErrorFallback message={error} raw={raw} />;
  }

  if (!svg) {
    return (
      <div className="my-5 border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
        Rendering mermaid diagram...
      </div>
    );
  }

  return (
    <div className="my-6 border border-border/60 bg-card p-4 overflow-x-auto">
      <div
        ref={containerRef}
        className="mermaid-diagram [&>svg]:max-w-full [&>svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

export default memo(
  MarkdownMermaidBlock,
  (previousProps, nextProps) => previousProps.raw === nextProps.raw
);
