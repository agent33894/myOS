import { addDays, format } from 'date-fns';
import { attempt, fail, isRecord, jsonObject, text, toJson, type BlockModel } from '../model';

export const ROADMAP_STATUSES = ['planned', 'in-progress', 'blocked', 'done', 'cancelled'] as const;
export type RoadmapStatus = (typeof ROADMAP_STATUSES)[number];

export const ROADMAP_PRIORITIES = ['high', 'medium', 'low'] as const;
export type RoadmapPriority = (typeof ROADMAP_PRIORITIES)[number];

export interface RoadmapLane {
  id: string;
  label: string;
}

export interface RoadmapItem {
  id: string;
  title: string;
  lane?: string;
  status: RoadmapStatus;
  priority?: RoadmapPriority;
  /** YYYY-MM-DD */
  start?: string;
  /** YYYY-MM-DD */
  target?: string;
  owner?: string;
  dependsOn?: string[];
  notes?: string;
}

export interface Roadmap {
  title?: string;
  timeframe?: string;
  lanes?: RoadmapLane[];
  items: RoadmapItem[];
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function parseDate(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const date = text(value);
  if (!date || !isIsoDate(date)) fail(`${label} must be a date like 2026-04-15.`);
  return date;
}

function oneOf<T extends string>(allowed: readonly T[], value: unknown, label: string): T | undefined {
  const normalized = text(value)?.toLowerCase();
  if (normalized === undefined) return undefined;
  if (!allowed.includes(normalized as T)) fail(`${label} “${normalized}” isn’t one of ${allowed.join(', ')}.`);
  return normalized as T;
}

function parseLanes(value: unknown): RoadmapLane[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) fail('Lanes must be a list.');
  const seen = new Set<string>();
  const lanes = value.map((entry, index) => {
    if (!isRecord(entry)) fail(`Lane ${index + 1} must be an object.`);
    const id = text(entry.id);
    const label = text(entry.label);
    if (!id || !label) fail(`Lane ${index + 1} needs an id and a name.`);
    if (seen.has(id)) fail(`Two lanes share the id “${id}”.`);
    seen.add(id);
    return { id, label };
  });
  return lanes.length ? lanes : undefined;
}

function parseItem(entry: unknown, index: number, laneIds: Set<string>): RoadmapItem {
  if (!isRecord(entry)) fail(`Item ${index + 1} must be an object.`);
  const id = text(entry.id);
  const title = text(entry.title);
  if (!id) fail(`Item ${index + 1} needs an id.`);
  if (!title) fail(`Item ${index + 1} needs a title.`);

  const status = oneOf(ROADMAP_STATUSES, entry.status, `${title}’s status`);
  if (!status) fail(`${title} needs a status.`);

  const lane = text(entry.lane);
  if (lane && laneIds.size > 0 && !laneIds.has(lane)) fail(`${title} is in a lane that doesn’t exist (“${lane}”).`);

  const start = parseDate(entry.start, `${title}’s start`);
  const target = parseDate(entry.target, `${title}’s target`);
  if (start && target && start > target) fail(`${title} ends before it starts.`);

  let dependsOn: string[] | undefined;
  if (entry.dependsOn !== undefined) {
    if (!Array.isArray(entry.dependsOn)) fail(`${title}’s dependencies must be a list.`);
    dependsOn = [...new Set(entry.dependsOn.map((dependency) => text(dependency) ?? fail(`${title} has an empty dependency.`)))];
    if (dependsOn.includes(id)) fail(`${title} can’t depend on itself.`);
  }

  return {
    id,
    title,
    lane,
    status,
    priority: oneOf(ROADMAP_PRIORITIES, entry.priority, `${title}’s priority`),
    start,
    target,
    owner: text(entry.owner),
    dependsOn: dependsOn?.length ? dependsOn : undefined,
    notes: text(entry.notes),
  };
}

function parseRoadmap(raw: string): Roadmap {
  const source = jsonObject(raw);
  const lanes = parseLanes(source.lanes);
  const laneIds = new Set((lanes ?? []).map((lane) => lane.id));
  if (!Array.isArray(source.items) || source.items.length === 0) fail('Add at least one item.');

  const itemIds = new Set<string>();
  const items = source.items.map((entry, index) => {
    const item = parseItem(entry, index, laneIds);
    if (itemIds.has(item.id)) fail(`Two items share the id “${item.id}”.`);
    itemIds.add(item.id);
    return item;
  });
  for (const item of items) {
    const unknown = item.dependsOn?.find((dependency) => !itemIds.has(dependency));
    if (unknown) fail(`${item.title} depends on an item that doesn’t exist (“${unknown}”).`);
  }
  return { title: text(source.title), timeframe: text(source.timeframe), lanes, items };
}

export const roadmapModel: BlockModel<Roadmap> = {
  parse: (raw) => attempt(() => parseRoadmap(raw)),
  serialize: ({ title, timeframe, lanes, items }) => toJson({ title, timeframe, lanes, items }),
};

/** An id not used by any of `taken`, shaped like `prefix-3`. */
export function nextId(prefix: string, taken: Array<{ id: string }>): string {
  const ids = new Set(taken.map((entry) => entry.id));
  let index = taken.length + 1;
  while (ids.has(`${prefix}-${index}`)) index += 1;
  return `${prefix}-${index}`;
}

export function newRoadmap(today = new Date()): Roadmap {
  const day = (offset: number) => format(addDays(today, offset), 'yyyy-MM-dd');
  return {
    title: 'Roadmap',
    lanes: [
      { id: 'build', label: 'Build' },
      { id: 'launch', label: 'Launch' },
    ],
    items: [
      { id: 'item-1', title: 'First milestone', lane: 'build', status: 'in-progress', start: day(0), target: day(13) },
      { id: 'item-2', title: 'Second milestone', lane: 'build', status: 'planned', start: day(14), target: day(34) },
      { id: 'item-3', title: 'Launch', lane: 'launch', status: 'planned', start: day(35), target: day(41), dependsOn: ['item-2'] },
    ],
  };
}
