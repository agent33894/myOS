import {
  BarChart3,
  Gauge,
  Map as MapIcon,
  MessageSquareQuote,
  Paperclip,
  Workflow,
} from 'lucide-react';
import type { InsertCommandOption } from '../../editor/InsertCommandMenu';

export const MERMAID_TEMPLATE = `\`\`\`mermaid
flowchart TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Action]
  B -->|No| D[Alternative]
\`\`\``;

export const CALLOUT_TEMPLATE = `\`\`\`callout
{
  "tone": "info",
  "title": "Important Context",
  "body": "Summarize the key takeaway in one sentence.",
  "items": [
    "Action item one",
    "Action item two"
  ]
}
\`\`\``;

export const KPI_TEMPLATE = `\`\`\`kpi
{
  "title": "Release Metrics",
  "items": [
    {
      "title": "Deploy Time",
      "value": 23,
      "unit": "min",
      "delta": -5,
      "deltaLabel": "vs last release",
      "target": 20
    },
    {
      "title": "Success Rate",
      "value": "99.9%",
      "delta": 0.3,
      "deltaLabel": "past 30 days"
    }
  ]
}
\`\`\``;

export const ROADMAP_TEMPLATE = `\`\`\`roadmap
{
  "title": "Q2 Product Roadmap",
  "timeframe": "Q2 2026",
  "lanes": [
    { "id": "platform", "label": "Platform" },
    { "id": "editor", "label": "Editor UX" },
    { "id": "analytics", "label": "Analytics" }
  ],
  "items": [
    {
      "id": "rm-1",
      "title": "Slash menu keyboard polish",
      "lane": "editor",
      "status": "in-progress",
      "priority": "high",
      "start": "2026-04-01",
      "target": "2026-04-15",
      "owner": "Jamie",
      "dependsOn": [],
      "notes": "Finish keyboard and accessibility pass."
    },
    {
      "id": "rm-2",
      "title": "KPI block presets",
      "lane": "analytics",
      "status": "planned",
      "priority": "medium",
      "target": "2026-05-10",
      "owner": "Jamie",
      "dependsOn": ["rm-1"]
    }
  ]
}
\`\`\``;

const INSERT_MENU_WIDTH = 340;
const INSERT_MENU_MAX_LIST_HEIGHT = 280;
const INSERT_MENU_ROW_HEIGHT = 54;
const INSERT_MENU_HEADER_HEIGHT = 33;
const INSERT_MENU_SEARCH_HEIGHT = 49;
const INSERT_MENU_EMPTY_HEIGHT = 56;
const INSERT_MENU_GAP = 8;
const VIEWPORT_PADDING = 12;

const INSERT_COMMANDS: InsertCommandOption[] = [
  {
    id: 'attach-asset',
    label: 'Attach Asset',
    description: 'Upload a local file and insert a markdown link.',
    icon: Paperclip,
    keywords: ['file', 'upload', 'attachment', 'image'],
  },
  {
    id: 'insert-chart',
    label: 'Chart',
    description: 'Open chart builder and insert a validated chart block.',
    icon: BarChart3,
    keywords: ['graph', 'recharts', 'metrics', 'data'],
  },
  {
    id: 'insert-mermaid',
    label: 'Mermaid Diagram',
    description: 'Insert a mermaid template for flowcharts and diagrams.',
    icon: Workflow,
    keywords: ['diagram', 'flowchart', 'sequence'],
  },
  {
    id: 'insert-callout',
    label: 'Callout',
    description: 'Insert a structured callout block for context and actions.',
    icon: MessageSquareQuote,
    keywords: ['note', 'info', 'alert'],
  },
  {
    id: 'insert-kpi',
    label: 'KPI Block',
    description: 'Insert a KPI template for metric snapshots.',
    icon: Gauge,
    keywords: ['metrics', 'dashboard', 'numbers'],
  },
  {
    id: 'insert-roadmap',
    label: 'Roadmap',
    description: 'Insert a structured roadmap with lanes, milestones, and dependencies.',
    icon: MapIcon,
    keywords: ['timeline', 'milestone', 'plan', 'quarter', 'delivery'],
  },
];

interface SlashMenuPosition {
  top: number;
  left: number;
}

interface SlashMenuPositionInput {
  optionCount: number;
  cursor: { top: number; bottom: number; left: number };
  viewport: { width: number; height: number };
}

export function filterInsertCommands(query: string): InsertCommandOption[] {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) return INSERT_COMMANDS;
  const tokens = trimmedQuery.split(/\s+/).filter(Boolean);
  return INSERT_COMMANDS.filter((command) => {
    const haystack = [
      command.label,
      command.description,
      ...(command.keywords || []),
    ].join(' ').toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

export function calculateSlashMenuPosition(
  input: SlashMenuPositionInput,
): SlashMenuPosition {
  const listHeight = input.optionCount === 0
    ? INSERT_MENU_EMPTY_HEIGHT
    : Math.min(INSERT_MENU_MAX_LIST_HEIGHT, input.optionCount * INSERT_MENU_ROW_HEIGHT);
  const menuHeight = INSERT_MENU_HEADER_HEIGHT + INSERT_MENU_SEARCH_HEIGHT + listHeight;
  const maxLeft = Math.max(
    VIEWPORT_PADDING,
    input.viewport.width - INSERT_MENU_WIDTH - VIEWPORT_PADDING,
  );
  const left = Math.min(Math.max(VIEWPORT_PADDING, input.cursor.left), maxLeft);
  const preferredBelowTop = input.cursor.bottom + INSERT_MENU_GAP;
  const overflowsBelow = preferredBelowTop + menuHeight
    > input.viewport.height - VIEWPORT_PADDING;
  const preferredTop = overflowsBelow
    ? input.cursor.top - menuHeight - INSERT_MENU_GAP
    : preferredBelowTop;
  const maxTop = Math.max(
    VIEWPORT_PADDING,
    input.viewport.height - menuHeight - VIEWPORT_PADDING,
  );
  return {
    top: Math.max(VIEWPORT_PADDING, Math.min(preferredTop, maxTop)),
    left,
  };
}
