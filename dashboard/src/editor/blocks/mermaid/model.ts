import type { BlockModel } from '../model';

/** Diagram source is Mermaid text, kept verbatim. */
export const mermaidModel: BlockModel<string> = {
  parse: (raw) => (raw.trim() ? { ok: true, value: raw } : { ok: false, error: 'Describe a diagram to draw.' }),
  serialize: (source) => source,
};

export const newDiagram = () => ['flowchart LR', '  Idea --> Draft', '  Draft --> Review', '  Review --> Done'].join('\n');
