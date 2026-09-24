import { lazy, type ComponentType } from 'react';
import { BarChart3, Gauge, GanttChartSquare, MessageSquareQuote, Workflow, type LucideIcon } from 'lucide-react';
import CalloutEditor from './callout/Editor';
import { calloutModel, newCallout } from './callout/model';
import CalloutView from './callout/View';
import ChartEditor from './chart/Editor';
import { chartModel, looksLikeChart, newChart } from './chart/model';
import KpiEditor from './kpi/Editor';
import { kpiModel, newKpi } from './kpi/model';
import KpiView from './kpi/View';
import MermaidEditor from './mermaid/Editor';
import { mermaidModel, newDiagram } from './mermaid/model';
import type { BlockModel } from './model';
import RoadmapEditor from './roadmap/Editor';
import { newRoadmap, roadmapModel } from './roadmap/model';
import RoadmapView from './roadmap/View';

export interface BlockDefinition<T> {
  label: string;
  description: string;
  icon: LucideIcon;
  keywords: string[];
  model: BlockModel<T>;
  create: () => T;
  View: ComponentType<{ value: T }>;
  Editor: ComponentType<{ value: T; onChange: (next: T) => void }>;
}

const define = <T>(definition: BlockDefinition<T>) => definition as BlockDefinition<unknown>;

/** Rich blocks are fenced code blocks whose language names one of these kinds. */
export const BLOCKS = {
  callout: define({
    label: 'Callout',
    description: 'A highlighted note, tip, or warning',
    icon: MessageSquareQuote,
    keywords: ['note', 'tip', 'warning', 'info', 'alert'],
    model: calloutModel,
    create: newCallout,
    View: CalloutView,
    Editor: CalloutEditor,
  }),
  chart: define({
    label: 'Chart',
    description: 'Bar, line, area, or pie chart from a small table',
    icon: BarChart3,
    keywords: ['graph', 'data', 'bar', 'line', 'pie', 'plot'],
    model: chartModel,
    create: newChart,
    // Heavy renderers load on first use.
    View: lazy(() => import('./chart/View')),
    Editor: ChartEditor,
  }),
  kpi: define({
    label: 'KPI',
    description: 'Key numbers with change and target',
    icon: Gauge,
    keywords: ['metric', 'numbers', 'stats', 'dashboard'],
    model: kpiModel,
    create: newKpi,
    View: KpiView,
    Editor: KpiEditor,
  }),
  roadmap: define({
    label: 'Roadmap',
    description: 'Milestones on a timeline, grouped in lanes',
    icon: GanttChartSquare,
    keywords: ['timeline', 'milestone', 'plan', 'gantt', 'schedule'],
    model: roadmapModel,
    create: () => newRoadmap(),
    View: RoadmapView,
    Editor: RoadmapEditor,
  }),
  mermaid: define({
    label: 'Diagram',
    description: 'Flowchart or sequence diagram, written in Mermaid',
    icon: Workflow,
    keywords: ['mermaid', 'flowchart', 'sequence', 'graph'],
    model: mermaidModel,
    create: newDiagram,
    View: lazy(() => import('./mermaid/View')),
    Editor: MermaidEditor,
  }),
};

export type BlockKind = keyof typeof BLOCKS;

const isKind = (value: string): value is BlockKind => Object.prototype.hasOwnProperty.call(BLOCKS, value);

/** The rich block a fence renders as, or null for ordinary code. */
export function blockKind(language: string | null | undefined, source: string): BlockKind | null {
  const name = (language ?? '').trim().toLowerCase();
  if (name) return isKind(name) ? name : null;
  return looksLikeChart(source) ? 'chart' : null;
}

/** Fence source for a freshly inserted block of `kind`. */
export function newBlockSource(kind: BlockKind): string {
  const definition = BLOCKS[kind];
  return definition.model.serialize(definition.create());
}
