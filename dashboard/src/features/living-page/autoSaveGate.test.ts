import { describe, expect, it } from 'vitest';
import { shouldRunAutoSaveAfterIdle } from './autoSaveGate';

describe('shouldRunAutoSaveAfterIdle', () => {
  it('allows autosave for existing artifacts after metadata-only edits', () => {
    expect(shouldRunAutoSaveAfterIdle({
      enableAutoSave: true,
      hasUnsavedChanges: true,
      isActivelyEditing: false,
      title: 'Existing artifact',
      isNewArtifact: false,
      artifactLoaded: true,
    })).toBe(true);
  });

  it('blocks autosave while actively editing', () => {
    expect(shouldRunAutoSaveAfterIdle({
      enableAutoSave: true,
      hasUnsavedChanges: true,
      isActivelyEditing: true,
      title: 'Existing artifact',
      isNewArtifact: false,
      artifactLoaded: true,
    })).toBe(false);
  });

  it('blocks autosave for new artifacts until the title is present', () => {
    expect(shouldRunAutoSaveAfterIdle({
      enableAutoSave: true,
      hasUnsavedChanges: true,
      isActivelyEditing: false,
      title: '   ',
      isNewArtifact: true,
      artifactLoaded: false,
    })).toBe(false);
  });
});
