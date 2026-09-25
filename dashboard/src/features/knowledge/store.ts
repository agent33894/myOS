import { create } from 'zustand';
import type { ArtifactSummary } from '@shared/types';

interface KnowledgeDialogs {
  /** The template picker, optionally creating into a project. */
  picker: { project?: string } | null;
  /** The page being saved as a template. */
  saveAs: ArtifactSummary | null;
}

/** Dialogs opened from menus and the palette, which close before the dialog opens. */
export const useKnowledgeDialogs = create<KnowledgeDialogs>(() => ({ picker: null, saveAs: null }));

// After the menu or palette that asked for it has closed and restored focus.
const later = (run: () => void) => window.setTimeout(run, 0);

export const openTemplatePicker = (options: { project?: string } = {}) =>
  later(() => useKnowledgeDialogs.setState({ picker: options, saveAs: null }));

export const openSaveAsTemplate = (item: ArtifactSummary) => later(() => useKnowledgeDialogs.setState({ saveAs: item, picker: null }));

export const closeKnowledgeDialogs = () => useKnowledgeDialogs.setState({ picker: null, saveAs: null });
