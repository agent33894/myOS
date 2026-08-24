import { describe, expect, it } from 'vitest';
import { validateRoadmapDraft, type RoadmapItemDraft } from './roadmapEditorModel';

function item(overrides: Partial<RoadmapItemDraft> = {}): RoadmapItemDraft {
  return {
    draftId: 'draft-1',
    id: 'rm-1',
    title: 'Ship editor extraction',
    lane: 'platform',
    status: 'in-progress',
    priority: 'high',
    start: '2026-08-12',
    target: '2026-08-14',
    owner: ' Jamie ',
    dependsOn: '',
    notes: ' Preserve behavior. ',
    ...overrides,
  };
}

describe('roadmap editor model', () => {
  it('normalizes drafts into the persisted roadmap schema', () => {
    const result = validateRoadmapDraft({
      title: ' Phase 3 ',
      timeframe: ' August ',
      lanes: [{ draftId: 'lane-draft', id: ' platform ', label: ' Platform ' }],
      items: [item()],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec).toMatchObject({
      title: 'Phase 3',
      timeframe: 'August',
      lanes: [{ id: 'platform', label: 'Platform' }],
      items: [{ owner: 'Jamie', notes: 'Preserve behavior.' }],
    });
    expect(JSON.parse(result.previewRaw)).toEqual(result.spec);
  });

  it('rejects partially filled lanes before serialization', () => {
    expect(validateRoadmapDraft({
      title: '',
      timeframe: '',
      lanes: [{ draftId: 'lane-draft', id: 'platform', label: '' }],
      items: [item({ lane: '' })],
    })).toEqual({ ok: false, error: 'Lane 1 requires both id and label.' });
  });

  it('delegates dependency and date validation to the shared roadmap schema', () => {
    const missingDependency = validateRoadmapDraft({
      title: '',
      timeframe: '',
      lanes: [],
      items: [item({ lane: '', dependsOn: 'rm-missing' })],
    });
    const reversedDates = validateRoadmapDraft({
      title: '',
      timeframe: '',
      lanes: [],
      items: [item({ lane: '', start: '2026-08-15', target: '2026-08-14' })],
    });

    expect(missingDependency.ok).toBe(false);
    expect(reversedDates.ok).toBe(false);
  });
});
