import { describe, expect, it } from 'vitest';
import { MarkdownManager } from '@tiptap/markdown';
import {
  createArtifactRendererExtensions,
  parseFencedCodeBlock,
  resolveRichBlockLanguage,
} from './artifactRendererContract';

describe('artifactRendererContract', () => {
  describe('parseFencedCodeBlock', () => {
    it('parses fenced code blocks and normalizes language', () => {
      const parsed = parseFencedCodeBlock('```Mermaid\nflowchart TD\nA-->B\n```');
      expect(parsed).toEqual({
        language: 'mermaid',
        body: 'flowchart TD\nA-->B',
      });
    });

    it('returns null for non-fenced content', () => {
      expect(parseFencedCodeBlock('plain text')).toBeNull();
    });
  });

  describe('resolveRichBlockLanguage', () => {
    it('resolves known explicit rich block languages', () => {
      expect(resolveRichBlockLanguage('kpi', '')).toBe('kpi');
      expect(resolveRichBlockLanguage('ROADMAP', '')).toBe('roadmap');
    });

    it('falls back to chart spec detection when language is missing', () => {
      const chartRaw =
        '{"type":"pie","title":"x","data":[{"label":"a","value":1}],"nameKey":"label","valueKey":"value"}';
      expect(resolveRichBlockLanguage(null, chartRaw)).toBe('chart');
    });
  });

  it('round-trips Markdown the editor must not rewrite', () => {
    const markdown = new MarkdownManager({
      extensions: createArtifactRendererExtensions({ placeholder: '' }),
    });
    const source = '- [ ] open\n- [x] done\n  - [ ] nested';
    expect(markdown.serialize(markdown.parse(source))).toBe(source);
  });
});
