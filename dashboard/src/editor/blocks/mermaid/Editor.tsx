import { Field, Textarea } from '../../../ui';

export default function MermaidEditor({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <Field label="Diagram" hint="Written in Mermaid, e.g. flowchart LR then one A --> B arrow per line.">
      <Textarea autosize spellCheck={false} className="min-h-24 font-mono text-sm" value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}
