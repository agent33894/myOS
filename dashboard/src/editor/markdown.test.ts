import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { MarkdownManager } from '@tiptap/markdown';
import { createExtensions } from './extensions';
import { connectMarkdown, needsSync } from './useMarkdownSync';

const markdown = new MarkdownManager({ extensions: createExtensions({ placeholder: '' }) });
const roundTrip = (source: string) => markdown.serialize(markdown.parse(source));

const fence = (language: string, body: string) => ['```' + language, body, '```'].join('\n');

const CHART = fence('chart', '{\n  "type": "bar",\n  "title": "Sales",\n  "data": [{ "m": "Jan", "v": 3 }],\n  "xKey": "m",\n  "series": [{ "key": "v" }]\n}');
// Older files wrote charts as a fence with no language.
const BARE_CHART = fence('', '{"type":"pie","title":"x","data":[{"label":"a","value":1}],"nameKey":"label","valueKey":"value"}');
const MERMAID = fence('mermaid', 'flowchart TD\n  A --> B');
const CALLOUT = fence('callout', '{ "tone": "info", "title": "Heads up" }');
const KPI = fence('kpi', '{"items":[{"title":"Users","value":1284,"delta":-3}]}');
const ROADMAP = fence('roadmap', '{"items":[{"id":"a","title":"Ship","status":"done"}]}');
const BROKEN = fence('chart', '{ not json');

describe('markdown round trip', () => {
  it('keeps every rich block fence byte for byte, including ones that do not parse', () => {
    for (const block of [CHART, BARE_CHART, MERMAID, CALLOUT, KPI, ROADMAP, BROKEN]) {
      const doc = markdown.parse(block);
      expect(doc.content?.[0]?.type).toBe('richBlock');
      expect(roundTrip(block)).toBe(block);
    }
  });

  it('leaves ordinary code fences as code blocks', () => {
    const code = fence('ts', 'const x = 1;');
    expect(markdown.parse(code).content?.[0]?.type).toBe('codeBlock');
    expect(roundTrip(code)).toBe(code);
    expect(markdown.parse(fence('', 'plain words')).content?.[0]?.type).toBe('codeBlock');
  });

  it('preserves a representative document', () => {
    const document = [
      '# Project kickoff',
      '',
      'Some **bold**, *italic*, ~~strike~~, `inline code` and a [link](https://example.com).',
      '',
      'A wiki link to [[Weekly review]] and [[Roadmap|the roadmap]].',
      '',
      '## Lists',
      '',
      '- one',
      '- two',
      '  - nested',
      '',
      '1. first',
      '2. second',
      '',
      '- [ ] open task',
      '- [x] done task',
      '  - [ ] nested task',
      '',
      '> A quote',
      '',
      CHART,
      '',
      CALLOUT,
      '',
      '![Diagram](assets/diagram.png)',
      '',
      '[Attachment](assets/report.pdf) and [a note](../notes/other.md) and [open](myos://artifact?path=notes/a.md)',
    ].join('\n');
    expect(roundTrip(document)).toBe(document);
  });

  it('aligns table columns once, without adding blank lines, then stays stable', () => {
    const source = ['Before', '', '---', '', '| Name | Value |', '| --- | --- |', '| a | 1 |', '', 'After'].join('\n');
    const once = roundTrip(source);
    expect(once).toBe(['Before', '', '---', '', '| Name | Value |', '| ---- | ----- |', '| a    | 1     |', '', 'After'].join('\n'));
    expect(roundTrip(once)).toBe(once);
  });
});

describe('editor binding', () => {
  // Files that the editor normalizes on load: a trailing newline, a doc
  // ending in a table or code block (TipTap appends a paragraph), tables.
  const FILES = ['Plain note\n', '| a | b |\n| --- | --- |\n| 1 | 2 |', `Intro\n\n${CHART}\n`, '```ts\nconst x = 1;\n```'];

  const open = (value: string) => {
    const editor = new Editor({ element: null, extensions: createExtensions({ placeholder: '' }), content: value, contentType: 'markdown' });
    // Headless editors skip plugins until mounted; add them as mounting would.
    editor.view.updateState(editor.state.reconfigure({ plugins: editor.extensionManager.plugins }));
    const changes: string[] = [];
    const sync = connectMarkdown(editor, { value, documentKey: 'a' }, (markdown) => changes.push(markdown));
    return { editor, changes, sync };
  };

  it('never reports a change for a value it was given', () => {
    for (const file of FILES) {
      const { editor, changes, sync } = open(file);
      editor.commands.setTextSelection(1);
      sync.receive(file, 'a');
      sync.receive(FILES[0], 'b');
      sync.receive('Reloaded from disk', 'b');
      editor.commands.selectAll();
      expect(changes).toEqual([]);
      editor.destroy();
    }
  });

  it('reports each real edit once', () => {
    const { editor, changes, sync } = open('Hello');
    editor.view.dispatch(editor.state.tr.insertText(' world', editor.state.doc.content.size - 1));
    expect(changes).toEqual(['Hello world']);
    sync.receive('Hello world\n', 'a'); // the host echoes it back from disk
    expect(editor.getMarkdown()).toBe('Hello world');
    expect(changes).toHaveLength(1);
    editor.destroy();
  });
});

describe('external value sync', () => {
  const current = (markdown: string) => () => markdown;
  const normalize = (source: string) => roundTrip(source);

  it('ignores echoes of our own change, however the host reformats them', () => {
    expect(needsSync('local', current('local'), 'local', normalize)).toBe(false);
    expect(needsSync('old', current('shown'), 'shown\n', normalize)).toBe(false);
    const table = '| a | b |\n| --- | --- |\n| 1 | 2 |';
    expect(needsSync('old', current(roundTrip(table)), table, normalize)).toBe(false);
  });

  it('loads genuinely new content', () => {
    expect(needsSync('mine', current('mine'), 'from disk', normalize)).toBe(true);
  });
});
