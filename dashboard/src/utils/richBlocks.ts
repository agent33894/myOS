export const SUPPORTED_CALLOUT_TONES = ['info', 'success', 'warning', 'error', 'neutral'] as const;
export type MarkdownCalloutTone = (typeof SUPPORTED_CALLOUT_TONES)[number];

interface MarkdownCalloutSpec {
  tone: MarkdownCalloutTone;
  title: string;
  body?: string;
  items?: string[];
}

export interface MarkdownKpiItem {
  title: string;
  value: string | number;
  unit?: string;
  delta?: number;
  deltaLabel?: string;
  target?: number;
}

interface MarkdownKpiSpec {
  title?: string;
  items: MarkdownKpiItem[];
}

export const SUPPORTED_ROADMAP_STATUSES = ['planned', 'in-progress', 'blocked', 'done', 'cancelled'] as const;
export type MarkdownRoadmapStatus = (typeof SUPPORTED_ROADMAP_STATUSES)[number];

export const SUPPORTED_ROADMAP_PRIORITIES = ['high', 'medium', 'low'] as const;
export type MarkdownRoadmapPriority = (typeof SUPPORTED_ROADMAP_PRIORITIES)[number];

export interface MarkdownRoadmapLane {
  id: string;
  label: string;
}

export interface MarkdownRoadmapItem {
  id: string;
  title: string;
  lane?: string;
  status: MarkdownRoadmapStatus;
  priority?: MarkdownRoadmapPriority;
  start?: string;
  target?: string;
  owner?: string;
  dependsOn?: string[];
  notes?: string;
}

interface MarkdownRoadmapSpec {
  title?: string;
  timeframe?: string;
  lanes?: MarkdownRoadmapLane[];
  items: MarkdownRoadmapItem[];
}

interface RichBlockParseError {
  message: string;
}

type RichBlockParseResult<T> =
  | {
      ok: true;
      spec: T;
    }
  | {
      ok: false;
      raw: string;
      error: RichBlockParseError;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toOptionalString(value: unknown): string | undefined {
  const stringValue = toTrimmedString(value);
  return stringValue || undefined;
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) {
    throw new Error('Block content must be a JSON object.');
  }
  return parsed;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

export function parseMarkdownMermaidBlock(raw: string): RichBlockParseResult<{ source: string }> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      ok: false,
      raw,
      error: { message: 'Mermaid block is empty. Provide diagram source text.' },
    };
  }

  return {
    ok: true,
    spec: { source: trimmed },
  };
}

export function parseMarkdownCalloutBlock(raw: string): RichBlockParseResult<MarkdownCalloutSpec> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      ok: false,
      raw,
      error: { message: 'Callout block is empty. Provide a JSON object.' },
    };
  }

  try {
    const payload = parseJsonObject(trimmed);
    const title = toTrimmedString(payload.title);
    if (!title) {
      throw new Error('`title` is required for callout blocks.');
    }

    const toneValue = toTrimmedString(payload.tone)?.toLowerCase() as MarkdownCalloutTone | undefined;
    const tone: MarkdownCalloutTone = toneValue && SUPPORTED_CALLOUT_TONES.includes(toneValue)
      ? toneValue
      : 'info';

    if (toneValue && !SUPPORTED_CALLOUT_TONES.includes(toneValue)) {
      throw new Error(
        `Unsupported callout tone "${toneValue}". Supported tones: ${SUPPORTED_CALLOUT_TONES.join(', ')}.`
      );
    }

    const body = toOptionalString(payload.body);
    const items = Array.isArray(payload.items)
      ? payload.items
          .map((entry) => toTrimmedString(entry))
          .filter((entry): entry is string => Boolean(entry))
      : undefined;

    if (!body && (!items || items.length === 0)) {
      throw new Error('Callout requires `body` or a non-empty `items` array.');
    }

    return {
      ok: true,
      spec: {
        tone,
        title,
        body,
        items: items && items.length > 0 ? items : undefined,
      },
    };
  } catch (error) {
    return {
      ok: false,
      raw,
      error: {
        message: error instanceof Error ? error.message : 'Invalid callout block.',
      },
    };
  }
}

function parseKpiItem(entry: unknown, index: number): MarkdownKpiItem {
  if (!isRecord(entry)) {
    throw new Error(`items[${index}] must be an object.`);
  }

  const title = toTrimmedString(entry.title);
  if (!title) {
    throw new Error(`items[${index}].title is required.`);
  }

  const value = entry.value;
  const hasNumericValue = typeof value === 'number' && Number.isFinite(value);
  const hasStringValue = typeof value === 'string' && value.trim().length > 0;
  if (!hasNumericValue && !hasStringValue) {
    throw new Error(`items[${index}].value must be a number or non-empty string.`);
  }

  const delta = entry.delta;
  if (delta !== undefined && (typeof delta !== 'number' || !Number.isFinite(delta))) {
    throw new Error(`items[${index}].delta must be a finite number when provided.`);
  }

  const target = entry.target;
  if (target !== undefined && (typeof target !== 'number' || !Number.isFinite(target))) {
    throw new Error(`items[${index}].target must be a finite number when provided.`);
  }

  return {
    title,
    value: hasNumericValue ? (value as number) : (value as string).trim(),
    unit: toOptionalString(entry.unit),
    delta: typeof delta === 'number' ? delta : undefined,
    deltaLabel: toOptionalString(entry.deltaLabel),
    target: typeof target === 'number' ? target : undefined,
  };
}

export function parseMarkdownKpiBlock(raw: string): RichBlockParseResult<MarkdownKpiSpec> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      ok: false,
      raw,
      error: { message: 'KPI block is empty. Provide a JSON object.' },
    };
  }

  try {
    const payload = parseJsonObject(trimmed);
    const title = toOptionalString(payload.title);
    const rawItems = Array.isArray(payload.items)
      ? payload.items
      : [payload];

    if (!rawItems.length) {
      throw new Error('KPI block requires at least one item.');
    }

    const items = rawItems.map((entry, index) => parseKpiItem(entry, index));

    return {
      ok: true,
      spec: {
        title,
        items,
      },
    };
  } catch (error) {
    return {
      ok: false,
      raw,
      error: {
        message: error instanceof Error ? error.message : 'Invalid KPI block.',
      },
    };
  }
}

function parseRoadmapLanes(payload: Record<string, unknown>): MarkdownRoadmapLane[] | undefined {
  if (payload.lanes === undefined) {
    return undefined;
  }

  if (!Array.isArray(payload.lanes)) {
    throw new Error('`lanes` must be an array when provided.');
  }

  const laneIds = new Set<string>();
  const lanes = payload.lanes.map((laneEntry, index) => {
    if (!isRecord(laneEntry)) {
      throw new Error(`lanes[${index}] must be an object.`);
    }

    const id = toTrimmedString(laneEntry.id);
    if (!id) {
      throw new Error(`lanes[${index}].id is required.`);
    }
    if (laneIds.has(id)) {
      throw new Error(`lanes[${index}].id "${id}" is duplicated.`);
    }
    laneIds.add(id);

    const label = toTrimmedString(laneEntry.label);
    if (!label) {
      throw new Error(`lanes[${index}].label is required.`);
    }

    return { id, label };
  });

  return lanes.length > 0 ? lanes : undefined;
}

function parseRoadmapDate(rawValue: unknown, fieldPath: string): string | undefined {
  if (rawValue === undefined || rawValue === null) return undefined;
  const date = toTrimmedString(rawValue);
  if (!date) {
    throw new Error(`${fieldPath} must be a non-empty string when provided.`);
  }
  if (!isIsoDate(date)) {
    throw new Error(`${fieldPath} must use YYYY-MM-DD.`);
  }
  return date;
}

function parseRoadmapItem(
  entry: unknown,
  index: number,
  laneIds: Set<string>
): MarkdownRoadmapItem {
  if (!isRecord(entry)) {
    throw new Error(`items[${index}] must be an object.`);
  }

  const id = toTrimmedString(entry.id);
  if (!id) {
    throw new Error(`items[${index}].id is required.`);
  }

  const title = toTrimmedString(entry.title);
  if (!title) {
    throw new Error(`items[${index}].title is required.`);
  }

  const statusValue = toTrimmedString(entry.status)?.toLowerCase() as MarkdownRoadmapStatus | undefined;
  if (!statusValue) {
    throw new Error(`items[${index}].status is required.`);
  }
  if (!SUPPORTED_ROADMAP_STATUSES.includes(statusValue)) {
    throw new Error(
      `items[${index}].status "${statusValue}" is invalid. Supported statuses: ${SUPPORTED_ROADMAP_STATUSES.join(', ')}.`
    );
  }

  const priorityValue = toTrimmedString(entry.priority)?.toLowerCase() as MarkdownRoadmapPriority | undefined;
  if (priorityValue && !SUPPORTED_ROADMAP_PRIORITIES.includes(priorityValue)) {
    throw new Error(
      `items[${index}].priority "${priorityValue}" is invalid. Supported priorities: ${SUPPORTED_ROADMAP_PRIORITIES.join(', ')}.`
    );
  }

  const lane = toOptionalString(entry.lane);
  if (lane && laneIds.size > 0 && !laneIds.has(lane)) {
    throw new Error(`items[${index}].lane "${lane}" does not match any lane id.`);
  }

  const start = parseRoadmapDate(entry.start, `items[${index}].start`);
  const target = parseRoadmapDate(entry.target, `items[${index}].target`);
  if (start && target && start > target) {
    throw new Error(`items[${index}] has an invalid range: start must be on or before target.`);
  }

  const dependsOn = entry.dependsOn === undefined
    ? undefined
    : (() => {
        if (!Array.isArray(entry.dependsOn)) {
          throw new Error(`items[${index}].dependsOn must be an array when provided.`);
        }
        const seen = new Set<string>();
        const values = entry.dependsOn
          .map((dependency, depIndex) => {
            const idValue = toTrimmedString(dependency);
            if (!idValue) {
              throw new Error(`items[${index}].dependsOn[${depIndex}] must be a non-empty string.`);
            }
            return idValue;
          })
          .filter((dependencyId) => {
            if (seen.has(dependencyId)) return false;
            seen.add(dependencyId);
            return true;
          });
        return values.length > 0 ? values : undefined;
      })();

  if (dependsOn && dependsOn.includes(id)) {
    throw new Error(`items[${index}].dependsOn cannot reference itself.`);
  }

  return {
    id,
    title,
    lane,
    status: statusValue,
    priority: priorityValue,
    start,
    target,
    owner: toOptionalString(entry.owner),
    dependsOn,
    notes: toOptionalString(entry.notes),
  };
}

export function parseMarkdownRoadmapBlock(raw: string): RichBlockParseResult<MarkdownRoadmapSpec> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      ok: false,
      raw,
      error: { message: 'Roadmap block is empty. Provide a JSON object.' },
    };
  }

  try {
    const payload = parseJsonObject(trimmed);
    const title = toOptionalString(payload.title);
    const timeframe = toOptionalString(payload.timeframe);
    const lanes = parseRoadmapLanes(payload);
    const laneIds = new Set((lanes || []).map((lane) => lane.id));

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error('Roadmap block requires a non-empty `items` array.');
    }

    const itemIds = new Set<string>();
    const items = payload.items.map((entry, index) => {
      const item = parseRoadmapItem(entry, index, laneIds);
      if (itemIds.has(item.id)) {
        throw new Error(`items[${index}].id "${item.id}" is duplicated.`);
      }
      itemIds.add(item.id);
      return item;
    });

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.dependsOn?.length) continue;
      const invalidDependency = item.dependsOn.find((dependencyId) => !itemIds.has(dependencyId));
      if (invalidDependency) {
        throw new Error(
          `items[${index}].dependsOn references unknown item id "${invalidDependency}".`
        );
      }
    }

    return {
      ok: true,
      spec: {
        title,
        timeframe,
        lanes,
        items,
      },
    };
  } catch (error) {
    return {
      ok: false,
      raw,
      error: {
        message: error instanceof Error ? error.message : 'Invalid roadmap block.',
      },
    };
  }
}
