import { useEffect, useState } from 'react';
import { useAccent } from '../../../app/useAccent';
import { Spinner } from '../../../ui';
import { renderDiagram } from './render';

type Diagram = { svg: string } | { error: string } | null;

export default function MermaidView({ value }: { value: string }) {
  const { hex, isDark } = useAccent();
  const [diagram, setDiagram] = useState<Diagram>(null);

  useEffect(() => {
    let current = true;
    // A short pause keeps half-typed source from flashing errors while editing.
    const timer = window.setTimeout(() => {
      renderDiagram(value, hex, isDark).then(
        (svg) => current && setDiagram({ svg }),
        (error: unknown) => current && setDiagram({ error: error instanceof Error ? error.message : String(error) }),
      );
    }, diagram ? 250 : 0);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [value, hex, isDark]);

  if (!diagram) {
    return (
      <div className="grid h-32 place-items-center">
        <Spinner label="Drawing diagram" />
      </div>
    );
  }
  if ('error' in diagram) {
    return (
      <div className="rounded-md bg-sunken p-4 font-sans text-sm">
        <div className="font-medium text-text">This diagram has a mistake in it</div>
        <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-text-secondary">{diagram.error}</pre>
      </div>
    );
  }
  // Mermaid runs with securityLevel "strict", which sanitizes the SVG it returns.
  return <div className="mermaid-diagram" role="img" aria-label="Diagram" dangerouslySetInnerHTML={{ __html: diagram.svg }} />;
}
