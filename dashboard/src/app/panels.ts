import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import { GitCommitHorizontal, History, Link2, ListTree, SlidersHorizontal } from 'lucide-react';
import { ChangesPanel } from '../features/git/ChangesPanel';
import { HistoryPanel } from '../features/history/HistoryPanel';
import { BacklinksPanel } from '../features/note/BacklinksPanel';
import { OutlinePanel } from '../features/note/OutlinePanel';
import { PropertiesPanel } from '../features/note/PropertiesPanel';

export type PanelId = 'outline' | 'backlinks' | 'properties' | 'changes' | 'history';

/** What every right-panel component receives: the note on screen, or null on Today, Tasks, and views. */
export interface PanelProps {
  path: string | null;
}

export interface PanelDef {
  id: PanelId;
  label: string;
  icon: LucideIcon;
  component: ComponentType<PanelProps>;
}

/** The right panel's sections, in order. Owners: note (Outline, Backlinks, Properties), git (Changes, History). */
export const PANELS: readonly PanelDef[] = [
  { id: 'outline', label: 'Outline', icon: ListTree, component: OutlinePanel },
  { id: 'backlinks', label: 'Backlinks', icon: Link2, component: BacklinksPanel },
  { id: 'properties', label: 'Properties', icon: SlidersHorizontal, component: PropertiesPanel },
  { id: 'changes', label: 'Changes', icon: GitCommitHorizontal, component: ChangesPanel },
  { id: 'history', label: 'History', icon: History, component: HistoryPanel },
];
