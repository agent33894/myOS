import { describe, expect, it } from 'vitest';
import {
  getRichBlockLabel,
  planExternalMarkdownSync,
  shouldDeleteRichBlockFromShell,
} from './richBlockEditing';

function keyboardInput(overrides: Partial<Parameters<typeof shouldDeleteRichBlockFromShell>[0]> = {}) {
  return {
    defaultPrevented: false,
    key: 'Backspace',
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    target: null,
    ...overrides,
  };
}

describe('rich block editing behavior', () => {
  it('handles unmodified delete keys from the block shell', () => {
    expect(shouldDeleteRichBlockFromShell(keyboardInput())).toBe(true);
    expect(shouldDeleteRichBlockFromShell(keyboardInput({ key: 'Delete' }))).toBe(true);
    expect(shouldDeleteRichBlockFromShell(keyboardInput({ key: 'Enter' }))).toBe(false);
    expect(shouldDeleteRichBlockFromShell(keyboardInput({ metaKey: true }))).toBe(false);
  });

  it('leaves delete behavior to nested editable controls', () => {
    const input = { tagName: 'INPUT', isContentEditable: false, closest: () => null } as unknown as HTMLElement;
    const comboboxChild = {
      tagName: 'SPAN',
      isContentEditable: false,
      closest: () => ({ role: 'combobox' }),
    } as unknown as HTMLElement;

    expect(shouldDeleteRichBlockFromShell(keyboardInput({ target: input }))).toBe(false);
    expect(shouldDeleteRichBlockFromShell(keyboardInput({ target: comboboxChild }))).toBe(false);
  });

  it('keeps announcements stable for every rich block language', () => {
    expect(['chart', 'callout', 'kpi', 'mermaid', 'roadmap'].map((language) => (
      getRichBlockLabel(language as Parameters<typeof getRichBlockLabel>[0])
    ))).toEqual(['Chart', 'Callout', 'KPI', 'Mermaid', 'Roadmap']);
  });

  it('syncs only genuinely external markdown changes', () => {
    expect(planExternalMarkdownSync('local', 'local', 'local')).toEqual({
      shouldSync: false,
      selectionPosition: null,
    });
    expect(planExternalMarkdownSync('local', 'normalized', 'local').shouldSync).toBe(false);
    expect(planExternalMarkdownSync('old', 'external', 'external').shouldSync).toBe(false);
    expect(planExternalMarkdownSync('old', 'current', 'external')).toEqual({
      shouldSync: true,
      selectionPosition: 0,
    });
  });
});
