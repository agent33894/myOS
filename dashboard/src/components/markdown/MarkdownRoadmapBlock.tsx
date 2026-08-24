import { memo } from 'react';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isValid,
  parseISO,
  startOfMonth,
} from 'date-fns';
import { AlertTriangle, Circle, Flag, Sparkles, UserRound } from 'lucide-react';
import { useAccentColor } from '../../hooks/useAccentColor';
import { getContrastTextColor } from '../../utils/colorPalette';
import {
  parseMarkdownRoadmapBlock,
  type MarkdownRoadmapItem,
  type MarkdownRoadmapPriority,
  type MarkdownRoadmapStatus,
} from '../../utils/richBlocks';

interface MarkdownRoadmapBlockProps {
  raw: string;
}

interface RoadmapLaneGroup {
  id: string;
  label: string;
  items: MarkdownRoadmapItem[];
}

interface ScheduledItem {
  item: MarkdownRoadmapItem;
  start: Date;
  end: Date;
  milestone: boolean;
}

interface ColorModel {
  hex: string;
  rgb: string;
  text: string;
  alpha?: number;
}

function hexToRgbString(hexColor: string): string | null {
  const normalized = hexColor.trim();
  const short = normalized.match(/^#([0-9a-f]{3})$/i);
  if (short) {
    const [r, g, b] = short[1].split('');
    const expanded = `#${r}${r}${g}${g}${b}${b}`;
    return hexToRgbString(expanded);
  }

  const full = normalized.match(/^#([0-9a-f]{6})$/i);
  if (!full) return null;
  const value = full[1];
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function rgba(rgb: string, alpha: number): string {
  return `rgba(${rgb}, ${alpha})`;
}

function getStatusTone(status: MarkdownRoadmapStatus, accentRgb: string): string {
  switch (status) {
    case 'done':
      return 'hsl(var(--ed-success))';
    case 'blocked':
      return 'hsl(var(--ed-error))';
    case 'planned':
      return 'hsl(var(--ed-warning))';
    case 'cancelled':
      return 'hsl(var(--muted-foreground))';
    case 'in-progress':
    default:
      return `rgb(${accentRgb})`;
  }
}

function priorityRank(priority?: MarkdownRoadmapPriority): number {
  if (priority === 'high') return 0;
  if (priority === 'medium') return 1;
  if (priority === 'low') return 2;
  return 3;
}

function laneGroupsFromItems(rawLanes: Array<{ id: string; label: string }> | undefined, items: MarkdownRoadmapItem[]): RoadmapLaneGroup[] {
  if (!rawLanes?.length) {
    return [{ id: 'general', label: 'General', items }];
  }

  const grouped = rawLanes.map((lane) => ({
    id: lane.id,
    label: lane.label,
    items: items.filter((item) => item.lane === lane.id),
  }));

  const unassigned = items.filter((item) => !item.lane);
  if (unassigned.length > 0) {
    grouped.push({
      id: 'general',
      label: 'General',
      items: unassigned,
    });
  }

  return grouped;
}

function getScheduledItem(item: MarkdownRoadmapItem): ScheduledItem | null {
  const startDate = item.start ? parseISO(item.start) : null;
  const targetDate = item.target ? parseISO(item.target) : null;
  const start = startDate && isValid(startDate) ? startDate : null;
  const target = targetDate && isValid(targetDate) ? targetDate : null;

  if (start && target) {
    return { item, start, end: target, milestone: false };
  }

  const point = start || target;
  if (!point) return null;
  return { item, start: point, end: point, milestone: true };
}

function compareRoadmapItems(a: MarkdownRoadmapItem, b: MarkdownRoadmapItem): number {
  const aSchedule = getScheduledItem(a);
  const bSchedule = getScheduledItem(b);
  if (aSchedule && bSchedule) {
    const byStart = aSchedule.start.getTime() - bSchedule.start.getTime();
    if (byStart !== 0) return byStart;
  } else if (aSchedule && !bSchedule) {
    return -1;
  } else if (!aSchedule && bSchedule) {
    return 1;
  }

  const byPriority = priorityRank(a.priority) - priorityRank(b.priority);
  if (byPriority !== 0) return byPriority;
  return a.title.localeCompare(b.title);
}

function makeColorModel(hexColor: string, fallbackRgb: string): ColorModel {
  const rgb = hexToRgbString(hexColor) || fallbackRgb;
  return {
    hex: hexColor,
    rgb,
    text: getContrastTextColor(rgb),
  };
}

function RoadmapErrorFallback({ message, raw, accentColor }: { message: string; raw: string; accentColor: string }) {
  return (
    <div className="my-5 border border-[hsl(var(--ed-warning))]/45 bg-card">
      <div className="h-[2px] w-full" style={{ backgroundColor: accentColor }} />
      <div className="flex items-center gap-2 border-b border-[hsl(var(--ed-warning))]/35 px-3 py-2 bg-[hsl(var(--ed-warning))]/8">
        <AlertTriangle className="h-4 w-4 text-[hsl(var(--ed-warning))]" />
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--ed-warning))]">
          Roadmap Block Warning
        </p>
      </div>
      <div className="px-3 py-3">
        <p className="mb-3 text-sm text-foreground">{message}</p>
        <pre className="overflow-x-auto border border-border/60 bg-secondary/50 p-3 text-xs">
          <code>{raw}</code>
        </pre>
      </div>
    </div>
  );
}

function MarkdownRoadmapBlock({ raw }: MarkdownRoadmapBlockProps) {
  const { pantoneColor } = useAccentColor();
  const accentRgb = pantoneColor?.rgb || '99, 102, 241';
  const accentHex = pantoneColor.hex;
  const parsed = parseMarkdownRoadmapBlock(raw);
  if (!parsed.ok) {
    return <RoadmapErrorFallback message={parsed.error.message} raw={parsed.raw} accentColor={accentHex} />;
  }

  const { spec } = parsed;
  const sortedItems = [...spec.items].sort(compareRoadmapItems);
  const laneGroups = laneGroupsFromItems(spec.lanes, sortedItems);
  const completedCount = spec.items.filter((item) => item.status === 'done').length;
  const scheduledItems = spec.items
    .map((item) => getScheduledItem(item))
    .filter((entry): entry is ScheduledItem => Boolean(entry));

  // Lane colors: the accent color itself at stepping alpha levels.
  // No hue/saturation manipulation — the user's chosen accent IS the palette.
  const laneAlphas = [0.85, 0.65, 0.50, 0.40, 0.32];
  const laneColorMap = new Map(
    laneGroups.map((lane, index) => {
      return [lane.id, {
        hex: accentHex,
        rgb: accentRgb,
        text: getContrastTextColor(accentRgb),
        alpha: laneAlphas[Math.min(index, laneAlphas.length - 1)],
      }] as const;
    })
  );

  const axisStart = scheduledItems.length > 0
    ? scheduledItems.reduce(
        (minimum, entry) => (entry.start < minimum ? entry.start : minimum),
        scheduledItems[0].start
      )
    : null;
  const naturalAxisEnd = scheduledItems.length > 0
    ? scheduledItems.reduce(
        (maximum, entry) => (entry.end > maximum ? entry.end : maximum),
        scheduledItems[0].end
      )
    : null;

  const axisEnd = axisStart && naturalAxisEnd
    ? (() => {
        const minSpanDays = 28;
        const naturalSpan = differenceInCalendarDays(naturalAxisEnd, axisStart) + 1;
        return naturalSpan >= minSpanDays ? naturalAxisEnd : addDays(axisStart, minSpanDays - 1);
      })()
    : null;

  const totalDays = axisStart && axisEnd
    ? Math.max(1, differenceInCalendarDays(axisEnd, axisStart) + 1)
    : 1;

  const toLeftPercent = (date: Date): number => {
    if (!axisStart) return 0;
    return (differenceInCalendarDays(date, axisStart) / totalDays) * 100;
  };

  const toRightPercent = (date: Date): number => {
    if (!axisStart) return 100;
    return ((differenceInCalendarDays(date, axisStart) + 1) / totalDays) * 100;
  };

  const monthSegments: Array<{ label: string; left: number; width: number }> = [];
  if (axisStart && axisEnd) {
    let cursor = startOfMonth(axisStart);
    while (cursor <= axisEnd) {
      const monthStart = cursor < axisStart ? axisStart : cursor;
      const monthEndRaw = endOfMonth(cursor);
      const monthEnd = monthEndRaw > axisEnd ? axisEnd : monthEndRaw;
      const left = toLeftPercent(monthStart);
      const width = Math.max(2, toRightPercent(monthEnd) - left);
      monthSegments.push({ label: format(cursor, 'MMM yyyy'), left, width });
      cursor = addMonths(cursor, 1);
    }
  }

  // Month boundary guides only (not weekly)
  const monthBoundaryGuides: number[] = [];
  if (axisStart && axisEnd) {
    let cursor = startOfMonth(addMonths(axisStart, 1));
    while (cursor <= axisEnd) {
      monthBoundaryGuides.push(toLeftPercent(cursor));
      cursor = addMonths(cursor, 1);
    }
  }

  const todayPercent = (() => {
    if (!axisStart || !axisEnd) return null;
    const today = new Date();
    if (today < axisStart || today > axisEnd) return null;
    return toLeftPercent(today);
  })();

  const progressPct = spec.items.length > 0
    ? Math.round((completedCount / spec.items.length) * 100)
    : 0;

  return (
    <div
      className="my-8 overflow-hidden bg-card"
      style={{
        border: `1px solid ${rgba(accentRgb, 0.12)}`,
        boxShadow: `0 1px 0 0 ${rgba(accentRgb, 0.06)}, 0 24px 48px -16px rgba(0, 0, 0, 0.55)`,
      }}
    >
      {/* Accent top rule — editorial weight */}
      <div className="h-[3px] w-full" style={{ backgroundColor: `rgb(${accentRgb})` }} />

      <div className="px-6 pt-5 pb-6">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-border/40 pb-4">
          <div>
            <p
              className="text-2xs font-medium uppercase tracking-[0.18em] mb-1.5"
              style={{ color: `rgb(${accentRgb})` }}
            >
              Roadmap
            </p>
            <h3 className="font-serif text-2xl leading-[1.15] text-foreground">
              {spec.title || 'Product Roadmap'}
            </h3>
            {spec.timeframe ? (
              <p className="mt-2 text-2xs uppercase tracking-[0.1em] text-muted-foreground/70">
                {spec.timeframe}
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-2xs font-medium uppercase tracking-[0.18em] text-muted-foreground/60 mb-1">
              Progress
            </p>
            <p className="text-lg font-serif tabular-nums text-foreground">
              <span style={{ color: `rgb(${accentRgb})` }}>{completedCount}</span>
              <span className="text-muted-foreground/40 mx-0.5">/</span>
              {spec.items.length}
            </p>
            {/* Mini progress bar */}
            <div className="mt-1.5 h-[2px] w-20 bg-border/30 ml-auto overflow-hidden">
              <div
                className="h-full transition-[width] duration-500"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: `rgb(${accentRgb})`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Gantt grid */}
        <div className="overflow-x-auto">
          <div
            className="min-w-[700px]"
            style={{ border: `1px solid ${rgba(accentRgb, 0.08)}` }}
          >
            {/* Column headers: Workstream + Month axis */}
            <div
              className="grid grid-cols-[220px_minmax(0,1fr)]"
              style={{
                borderBottom: `1px solid ${rgba(accentRgb, 0.1)}`,
                backgroundColor: rgba(accentRgb, 0.03),
              }}
            >
              <div
                className="flex items-center px-4 py-3"
                style={{ borderRight: `1px solid ${rgba(accentRgb, 0.08)}` }}
              >
                <p className="text-2xs font-medium uppercase tracking-[0.16em] text-muted-foreground/60">
                  Workstream
                </p>
              </div>
              <div className="relative h-9">
                {monthSegments.length > 0 ? (
                  monthSegments.map((segment, index) => (
                    <div
                      key={segment.label}
                      className="absolute inset-y-0 flex items-center"
                      style={{
                        left: `${segment.left}%`,
                        width: `${segment.width}%`,
                        borderRight: index < monthSegments.length - 1
                          ? `1px solid ${rgba(accentRgb, 0.08)}`
                          : 'none',
                      }}
                    >
                      <span className="pl-3 text-2xs font-medium uppercase tracking-[0.14em] text-muted-foreground/50">
                        {segment.label}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="inline-flex h-full items-center px-3 text-xs italic text-muted-foreground/50">
                    Add start or target dates to render timeline bars.
                  </span>
                )}
                {todayPercent !== null ? (
                  <div
                    className="pointer-events-none absolute bottom-0 z-[3]"
                    style={{
                      left: `${todayPercent}%`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <span
                      className="text-3xs font-semibold uppercase tracking-[0.14em]"
                      style={{ color: `rgb(${accentRgb})` }}
                    >
                      Today
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Lane sections */}
            {laneGroups.map((lane) => {
              const laneColor = laneColorMap.get(lane.id) || makeColorModel(accentHex, accentRgb);

              // Empty lane: collapsed single line
              if (lane.items.length === 0) {
                return (
                  <div
                    key={lane.id}
                    className="grid grid-cols-[220px_minmax(0,1fr)]"
                    style={{
                      borderBottom: `1px solid ${rgba(accentRgb, 0.06)}`,
                      height: '32px',
                    }}
                  >
                    <div
                      className="flex items-center px-4"
                      style={{
                        borderRight: `1px solid ${rgba(accentRgb, 0.08)}`,
                        borderLeft: `3px solid ${rgba(laneColor.rgb, (laneColor.alpha ?? 0.8) * 0.3)}`,
                      }}
                    >
                      <p className="text-2xs italic text-muted-foreground/40">
                        {lane.label}
                        <span className="ml-1.5">&mdash;</span>
                        <span className="ml-1.5">no items</span>
                      </p>
                    </div>
                    <div />
                  </div>
                );
              }

              return (
                <section
                  key={lane.id}
                  style={{ borderBottom: `1px solid ${rgba(accentRgb, 0.06)}` }}
                >
                  {/* Lane header */}
                  <div className="grid grid-cols-[220px_minmax(0,1fr)]">
                    <div
                      className="px-4 py-2"
                      style={{
                        borderRight: `1px solid ${rgba(accentRgb, 0.08)}`,
                        borderLeft: `3px solid ${rgba(laneColor.rgb, laneColor.alpha ?? 0.8)}`,
                      }}
                    >
                      <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-foreground/90">
                        {lane.label}
                        <span
                          className="ml-2 inline-flex h-[16px] min-w-[16px] items-center justify-center px-1 text-3xs font-medium"
                          style={{
                            backgroundColor: rgba(laneColor.rgb, (laneColor.alpha ?? 0.8) * 0.15),
                            color: rgba(laneColor.rgb, laneColor.alpha ?? 0.8),
                          }}
                        >
                          {lane.items.length}
                        </span>
                      </p>
                    </div>
                    <div />
                  </div>

                  {/* Item rows */}
                  {lane.items.map((item, itemIndex) => {
                    const scheduled = getScheduledItem(item);
                    // Combine lane alpha with per-item stepping for subtle distinction
                    const laneBase = laneColor.alpha ?? 0.8;
                    const itemStep = Math.max(0.7, 1 - itemIndex * 0.08);
                    const barAlpha = laneBase * itemStep;
                    const left = axisStart && scheduled ? toLeftPercent(scheduled.start) : 0;
                    const width = axisStart && scheduled
                      ? Math.max(scheduled.milestone ? 1.8 : 3, toRightPercent(scheduled.end) - left)
                      : 0;
                    const statusTone = getStatusTone(item.status, accentRgb);

                    return (
                      <div
                        key={item.id}
                        className="group grid grid-cols-[220px_minmax(0,1fr)] transition-colors duration-150"
                        style={{
                          borderTop: `1px solid ${rgba(accentRgb, 0.05)}`,
                        }}
                      >
                        {/* Item detail column */}
                        <div
                          className="px-4 py-3"
                          style={{ borderRight: `1px solid ${rgba(accentRgb, 0.08)}` }}
                        >
                          <p className="truncate text-xs font-medium leading-snug text-foreground/90">
                            {item.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground/50">
                            {/* Status */}
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="inline-block h-[5px] w-[5px] shrink-0 rounded-full"
                                style={{ backgroundColor: statusTone }}
                              />
                              <span className="capitalize">{item.status}</span>
                            </span>
                            {/* ID */}
                            <span className="font-mono uppercase tracking-[0.06em] opacity-50">
                              {item.id}
                            </span>
                            {/* Priority */}
                            {item.priority ? (
                              <span className="inline-flex items-center gap-1">
                                <Flag className="h-3 w-3 opacity-60" />
                                <span className="capitalize">{item.priority}</span>
                              </span>
                            ) : null}
                            {/* Owner */}
                            {item.owner ? (
                              <span className="inline-flex items-center gap-1">
                                <UserRound className="h-3 w-3 opacity-60" />
                                {item.owner}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Timeline bar area */}
                        <div
                          className="relative overflow-hidden"
                          style={{
                            height: '52px',
                            borderTop: `1px solid ${rgba(accentRgb, 0.03)}`,
                          }}
                        >
                          {/* Alternating row tint */}
                          <div
                            className="absolute inset-0"
                            style={{ backgroundColor: rgba(accentRgb, 0.015) }}
                          />

                          {/* Month boundary guide lines — dashed for editorial feel */}
                          {monthBoundaryGuides.map((guide, index) => (
                            <div
                              key={`${item.id}-month-${index}`}
                              className="absolute inset-y-0"
                              style={{
                                left: `${guide}%`,
                                width: '1px',
                                backgroundImage: `repeating-linear-gradient(to bottom, ${rgba(accentRgb, 0.08)} 0px, ${rgba(accentRgb, 0.08)} 3px, transparent 3px, transparent 7px)`,
                              }}
                            />
                          ))}

                          {/* Today marker — dashed accent line */}
                          {todayPercent !== null ? (
                            <div
                              className="absolute inset-y-0 z-[1]"
                              style={{
                                left: `${todayPercent}%`,
                                width: '1px',
                                backgroundImage: `repeating-linear-gradient(to bottom, rgb(${accentRgb}) 0px, rgb(${accentRgb}) 4px, transparent 4px, transparent 8px)`,
                              }}
                            />
                          ) : null}

                          {/* Gantt bar — colored by lane, alpha-stepped within lane */}
                          {scheduled ? (
                            <div
                              className="absolute top-1/2 z-[2] -translate-y-1/2 overflow-hidden"
                              style={{
                                left: scheduled.milestone ? `calc(${left}% - 7px)` : `${left}%`,
                                width: scheduled.milestone ? '14px' : `${width}%`,
                                minWidth: scheduled.milestone ? '14px' : '32px',
                                height: scheduled.milestone ? '14px' : '24px',
                                backgroundColor: rgba(laneColor.rgb, barAlpha),
                                borderLeft: scheduled.milestone ? 'none' : `2px solid ${rgba(laneColor.rgb, laneColor.alpha ?? 0.8)}`,
                                boxShadow: `0 1px 4px -1px ${rgba(laneColor.rgb, (laneColor.alpha ?? 0.8) * 0.3)}`,
                              }}
                              title={scheduled.milestone
                                ? `${item.title} · ${item.target || item.start || ''}`
                                : `${item.title} · ${item.start || ''} → ${item.target || ''}`
                              }
                            >
                              {scheduled.milestone ? (
                                <span
                                  className="flex h-full w-full items-center justify-center"
                                  style={{ color: laneColor.text }}
                                >
                                  <Circle className="h-3 w-3 fill-current" />
                                </span>
                              ) : (
                                <>
                                  {/* Status edge indicator */}
                                  <span
                                    className="absolute inset-y-0 right-0 w-[3px]"
                                    style={{ backgroundColor: statusTone }}
                                  />
                                  {/* Title inside bar */}
                                  <span
                                    className="block truncate px-2 text-2xs font-medium leading-[24px] tracking-[0.02em]"
                                    style={{ color: laneColor.text }}
                                  >
                                    {item.title}
                                  </span>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="absolute inset-0 flex items-center gap-1.5 px-3 text-2xs italic text-muted-foreground/40">
                              <Sparkles className="h-3 w-3" style={{ color: rgba(accentRgb, 0.3) }} />
                              Missing start/target date
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </section>
              );
            })}

          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(
  MarkdownRoadmapBlock,
  (previousProps, nextProps) => previousProps.raw === nextProps.raw
);
