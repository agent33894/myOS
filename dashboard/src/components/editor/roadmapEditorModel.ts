import {
  parseMarkdownRoadmapBlock,
  type MarkdownRoadmapPriority,
  type MarkdownRoadmapStatus,
} from '../../utils/richBlocks';

type MarkdownRoadmapSpec = Extract<
  ReturnType<typeof parseMarkdownRoadmapBlock>,
  { ok: true }
>['spec'];

export interface RoadmapLaneDraft {
  draftId: string;
  id: string;
  label: string;
}

export interface RoadmapItemDraft {
  draftId: string;
  id: string;
  title: string;
  lane: string;
  status: MarkdownRoadmapStatus;
  priority: '' | MarkdownRoadmapPriority;
  start: string;
  target: string;
  owner: string;
  dependsOn: string;
  notes: string;
}

interface RoadmapDraftInput {
  title: string;
  timeframe: string;
  lanes: RoadmapLaneDraft[];
  items: RoadmapItemDraft[];
}

type RoadmapDraftValidation =
  | { ok: true; spec: MarkdownRoadmapSpec; previewRaw: string }
  | { ok: false; error: string };

export function validateRoadmapDraft(input: RoadmapDraftInput): RoadmapDraftValidation {
  const normalizedLanes = [];
  for (let index = 0; index < input.lanes.length; index += 1) {
    const lane = input.lanes[index];
    const id = lane.id.trim();
    const label = lane.label.trim();
    if (!id && !label) continue;
    if (!id || !label) {
      return { ok: false, error: `Lane ${index + 1} requires both id and label.` };
    }
    normalizedLanes.push({ id, label });
  }

  const normalizedItems = input.items.map((item) => {
    const dependencies = item.dependsOn
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    return {
      id: item.id.trim(),
      title: item.title.trim(),
      lane: item.lane.trim() || undefined,
      status: item.status,
      priority: item.priority || undefined,
      start: item.start.trim() || undefined,
      target: item.target.trim() || undefined,
      owner: item.owner.trim() || undefined,
      dependsOn: dependencies.length > 0 ? dependencies : undefined,
      notes: item.notes.trim() || undefined,
    };
  });
  const candidate = {
    title: input.title.trim() || undefined,
    timeframe: input.timeframe.trim() || undefined,
    lanes: normalizedLanes.length > 0 ? normalizedLanes : undefined,
    items: normalizedItems,
  };
  const parsed = parseMarkdownRoadmapBlock(JSON.stringify(candidate));

  if (!parsed.ok) return { ok: false, error: parsed.error.message };
  return {
    ok: true,
    spec: parsed.spec,
    previewRaw: JSON.stringify(parsed.spec),
  };
}
