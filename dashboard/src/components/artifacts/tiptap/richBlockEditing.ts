import type { RichBlockLanguage } from './artifactRendererContract';

interface RichBlockShellKeyInput {
  defaultPrevented: boolean;
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  target: EventTarget | null;
}

function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  if (element.isContentEditable) return true;
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
    return true;
  }
  return Boolean(element.closest?.('[role="textbox"], [role="combobox"], [contenteditable="true"]'));
}

export function shouldDeleteRichBlockFromShell(event: RichBlockShellKeyInput): boolean {
  if (event.defaultPrevented) return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  if (event.key !== 'Backspace' && event.key !== 'Delete') return false;
  return !isEditableTarget(event.target);
}

export function getRichBlockLabel(language: RichBlockLanguage): string {
  switch (language) {
    case 'kpi':
      return 'KPI';
    case 'roadmap':
      return 'Roadmap';
    case 'callout':
      return 'Callout';
    case 'mermaid':
      return 'Mermaid';
    case 'chart':
      return 'Chart';
  }
}

interface ExternalMarkdownSyncPlan {
  shouldSync: boolean;
  selectionPosition: number | null;
}

export function planExternalMarkdownSync(
  lastEmittedValue: string | null,
  currentMarkdown: string,
  nextValue: string,
): ExternalMarkdownSyncPlan {
  const shouldSync = lastEmittedValue !== nextValue && currentMarkdown !== nextValue;
  return {
    shouldSync,
    selectionPosition: shouldSync ? 0 : null,
  };
}
