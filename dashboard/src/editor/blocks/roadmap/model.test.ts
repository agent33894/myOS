import { describe, expect, it } from 'vitest';
import { roadmapModel } from './model';

const roadmap = {
  title: 'Q2',
  timeframe: 'Q2 2026',
  lanes: [
    { id: 'editor', label: 'Editor' },
    { id: 'data', label: 'Data' },
  ],
  items: [
    { id: 'a', title: 'Slash menu', lane: 'editor', status: 'in-progress', priority: 'high', start: '2026-04-01', target: '2026-04-15', owner: 'Jamie' },
    { id: 'b', title: 'KPI presets', lane: 'data', status: 'planned', target: '2026-05-10', dependsOn: ['a'], notes: 'After the menu' },
  ],
};

describe('roadmap model', () => {
  it('parses a roadmap and serializes it back unchanged', () => {
    const parsed = roadmapModel.parse(JSON.stringify(roadmap));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(JSON.parse(roadmapModel.serialize(parsed.value))).toEqual(roadmap);
  });

});
