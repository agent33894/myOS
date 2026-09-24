import { addDays, addMonths, differenceInCalendarDays, format, max, min, parseISO, startOfMonth } from 'date-fns';
import type { Roadmap, RoadmapItem, RoadmapLane } from './model';

// Pure layout for the roadmap timeline: every position is a percentage of the
// visible date range, so the view can draw with SVG attributes, not styles.

export interface Span {
  left: number;
  width: number;
}

export interface Timeline {
  months: Array<{ label: string; left: number }>;
  today: number | null;
  spanOf(item: RoadmapItem): Span | null;
}

const MIN_DAYS = 28;

export function buildTimeline(items: RoadmapItem[], now = new Date()): Timeline | null {
  const dates = items.flatMap((item) => [item.start, item.target]).filter((date): date is string => !!date).map((date) => parseISO(date));
  if (!dates.length) return null;
  const start = min(dates);
  const end = max([max(dates), addDays(start, MIN_DAYS - 1)]);
  const days = differenceInCalendarDays(end, start) + 1;
  const at = (date: Date) => (differenceInCalendarDays(date, start) / days) * 100;

  const months: Timeline['months'] = [];
  for (let month = startOfMonth(start); month <= end; month = addMonths(month, 1)) {
    months.push({ label: format(month, months.length === 0 || month.getMonth() === 0 ? 'MMM yyyy' : 'MMM'), left: Math.max(0, at(month)) });
  }

  const todayAt = at(now);
  return {
    months,
    today: todayAt >= 0 && todayAt <= 100 ? todayAt : null,
    spanOf(item) {
      const from = item.start ?? item.target;
      const to = item.target ?? item.start;
      if (!from || !to) return null;
      const left = at(parseISO(from));
      return { left, width: Math.max(1.5, at(addDays(parseISO(to), 1)) - left) };
    },
  };
}

/** Lanes in order with their items; items without a known lane gather under "Other". */
export function groupByLane(roadmap: Roadmap): Array<{ lane: RoadmapLane | null; items: RoadmapItem[] }> {
  const lanes = roadmap.lanes ?? [];
  const known = new Set(lanes.map((lane) => lane.id));
  const groups = lanes.map((lane) => ({ lane: lane as RoadmapLane | null, items: roadmap.items.filter((item) => item.lane === lane.id) }));
  const rest = roadmap.items.filter((item) => !item.lane || !known.has(item.lane));
  if (rest.length) groups.push({ lane: null, items: rest });
  return groups.filter((group) => group.items.length || group.lane);
}
