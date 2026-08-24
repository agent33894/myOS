import { describe, expect, it } from 'vitest';
import {
  parseMarkdownCalloutBlock,
  parseMarkdownKpiBlock,
  parseMarkdownMermaidBlock,
  parseMarkdownRoadmapBlock,
} from './richBlocks';

describe('parseMarkdownMermaidBlock', () => {
  it('parses non-empty mermaid content', () => {
    const result = parseMarkdownMermaidBlock('flowchart TD\nA-->B');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.source).toContain('flowchart');
  });

  it('rejects empty mermaid content', () => {
    const result = parseMarkdownMermaidBlock('   ');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('empty');
  });
});

describe('parseMarkdownCalloutBlock', () => {
  it('parses a valid callout with body and items', () => {
    const result = parseMarkdownCalloutBlock(
      JSON.stringify({
        tone: 'warning',
        title: 'Heads up',
        body: 'This can impact production.',
        items: ['Validate config', 'Run smoke checks'],
      })
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.tone).toBe('warning');
    expect(result.spec.items?.length).toBe(2);
  });

  it('rejects callout missing title', () => {
    const result = parseMarkdownCalloutBlock(JSON.stringify({ body: 'Missing title' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('title');
  });

  it('rejects unsupported callout tone', () => {
    const result = parseMarkdownCalloutBlock(
      JSON.stringify({
        tone: 'urgent',
        title: 'Invalid',
        body: 'Nope',
      })
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('Supported tones');
  });
});

describe('parseMarkdownKpiBlock', () => {
  it('parses a valid KPI block with items', () => {
    const result = parseMarkdownKpiBlock(
      JSON.stringify({
        title: 'Release Metrics',
        items: [
          { title: 'Deploy Time', value: 23, unit: 'min', delta: -5 },
          { title: 'Success Rate', value: '99.9%', deltaLabel: 'past 30 days' },
        ],
      })
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.items.length).toBe(2);
    expect(result.spec.items[0]?.delta).toBe(-5);
  });

  it('supports single-item KPI object shape', () => {
    const result = parseMarkdownKpiBlock(
      JSON.stringify({
        title: 'Coverage',
        value: 87,
        unit: '%',
      })
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.items.length).toBe(1);
    expect(result.spec.items[0]?.title).toBe('Coverage');
  });

  it('rejects KPI items with invalid value', () => {
    const result = parseMarkdownKpiBlock(
      JSON.stringify({
        items: [{ title: 'Broken', value: null }],
      })
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('value');
  });
});

describe('parseMarkdownRoadmapBlock', () => {
  it('parses a valid roadmap block', () => {
    const result = parseMarkdownRoadmapBlock(
      JSON.stringify({
        title: 'Q2 Product Roadmap',
        timeframe: 'Q2 2026',
        lanes: [
          { id: 'editor', label: 'Editor UX' },
          { id: 'analytics', label: 'Analytics' },
        ],
        items: [
          {
            id: 'rm-1',
            title: 'Keyboard navigation polish',
            lane: 'editor',
            status: 'in-progress',
            priority: 'high',
            start: '2026-04-01',
            target: '2026-04-15',
          },
          {
            id: 'rm-2',
            title: 'Roadmap block presets',
            lane: 'analytics',
            status: 'planned',
            dependsOn: ['rm-1'],
          },
        ],
      })
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.lanes?.length).toBe(2);
    expect(result.spec.items[1]?.dependsOn).toEqual(['rm-1']);
  });

  it('rejects roadmap items that reference unknown dependencies', () => {
    const result = parseMarkdownRoadmapBlock(
      JSON.stringify({
        items: [
          {
            id: 'rm-1',
            title: 'First item',
            status: 'planned',
            dependsOn: ['rm-999'],
          },
        ],
      })
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('unknown item id');
  });

  it('rejects roadmap items with invalid dates', () => {
    const result = parseMarkdownRoadmapBlock(
      JSON.stringify({
        items: [
          {
            id: 'rm-1',
            title: 'Broken date',
            status: 'planned',
            target: '2026-02-30',
          },
        ],
      })
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('YYYY-MM-DD');
  });

  it('rejects roadmap ranges where start is after target', () => {
    const result = parseMarkdownRoadmapBlock(
      JSON.stringify({
        items: [
          {
            id: 'rm-1',
            title: 'Range error',
            status: 'planned',
            start: '2026-05-10',
            target: '2026-04-10',
          },
        ],
      })
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('start must be on or before target');
  });
});
