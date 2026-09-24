import { describe, expect, it } from 'vitest';
import { newRoadmap, nextId, roadmapModel } from './model';
import { buildTimeline, groupByLane } from './timeline';

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

  it('rejects inconsistent roadmaps with a readable reason', () => {
    const item = roadmap.items[0];
    const cases: Array<[object, RegExp]> = [
      [{ items: [] }, /at least one item/],
      [{ ...roadmap, items: [{ ...item, status: 'someday' }] }, /isn’t one of/],
      [{ ...roadmap, items: [{ ...item, start: '2026-05-01', target: '2026-04-01' }] }, /ends before it starts/],
      [{ ...roadmap, items: [{ ...item, target: '2026-02-30' }] }, /must be a date/],
      [{ ...roadmap, items: [{ ...item, lane: 'missing' }] }, /lane that doesn’t exist/],
      [{ ...roadmap, items: [{ ...item, dependsOn: ['zzz'] }] }, /doesn’t exist/],
      [{ ...roadmap, items: [item, { ...item }] }, /share the id/],
    ];
    for (const [input, message] of cases) {
      const parsed = roadmapModel.parse(JSON.stringify(input));
      expect(parsed.ok ? '' : parsed.error).toMatch(message);
    }
  });

  it('creates a valid starting roadmap and fresh ids', () => {
    const fresh = newRoadmap(new Date(2026, 0, 5));
    expect(roadmapModel.parse(roadmapModel.serialize(fresh)).ok).toBe(true);
    expect(nextId('item', fresh.items)).toBe('item-4');
  });

  it('lays items out on a timeline and groups them by lane', () => {
    const parsed = roadmapModel.parse(JSON.stringify(roadmap));
    if (!parsed.ok) throw new Error(parsed.error);
    const timeline = buildTimeline(parsed.value.items, new Date(2026, 3, 8))!;
    expect(timeline.months.map((month) => month.label)).toEqual(['Apr 2026', 'May']);
    const span = timeline.spanOf(parsed.value.items[0])!;
    expect(span.left).toBe(0);
    expect(timeline.today).toBeGreaterThan(0);
    expect(groupByLane(parsed.value).map((group) => group.lane?.id)).toEqual(['editor', 'data']);
  });
});
