import { describe, expect, it } from 'vitest';
import type { Artifact } from '../../types/artifacts';
import { ArtifactType, Domain, TodoStatus } from '../../types/artifacts';
import {
  LIVING_PAGE_ECHO_WINDOW_MS,
  buildLivingPageArtifact,
  shouldReloadFromExternalChange,
} from './livingPageSave';

const base: Artifact = {
  id: 'memo-1',
  filePath: '/vault/work/memos/memo-1.md',
  title: 'Canvas paradigm',
  type: ArtifactType.MEMO,
  domain: Domain.WORK,
  tags: ['design'],
  created: '2026-08-01',
  updated: '2026-08-10T10:00:00.000Z',
  content: '',
} as Artifact;

describe('buildLivingPageArtifact', () => {
  it('merges title and body over the latest store artifact', () => {
    const next = buildLivingPageArtifact(base, {
      filePath: base.filePath,
      title: '  Renamed  ',
      body: 'Body.',
      hadEcho: false,
      dirty: true,
    });
    expect(next.title).toBe('Renamed');
    expect(next.content).toBe('Body.');
    expect(next.tags).toEqual(['design']);
  });

  it('restores the scaffolded title echo on save', () => {
    const next = buildLivingPageArtifact(base, {
      filePath: base.filePath,
      title: 'Renamed',
      body: 'Body.',
      hadEcho: true,
      dirty: true,
    });
    expect(next.content).toBe('# Renamed\n\nBody.');
  });

  it('applies overrides last (todo toggles ride the same save)', () => {
    const next = buildLivingPageArtifact(base, {
      filePath: base.filePath,
      title: 'Canvas paradigm',
      body: 'Body.',
      hadEcho: false,
      dirty: true,
    }, { status: TodoStatus.DONE, completedDate: '2026-08-10' });
    expect(next.status).toBe(TodoStatus.DONE);
    expect(next.completedDate).toBe('2026-08-10');
  });
});

describe('shouldReloadFromExternalChange', () => {
  const now = 1_000_000;

  it('reloads a clean pane outside the echo window', () => {
    expect(
      shouldReloadFromExternalChange({
        hasUnsavedChanges: false,
        isSaving: false,
        lastSaveAt: now - LIVING_PAGE_ECHO_WINDOW_MS - 1,
        now,
      }),
    ).toBe(true);
  });

  it('ignores changes while the pane is dirty — our edits outrank', () => {
    expect(
      shouldReloadFromExternalChange({
        hasUnsavedChanges: true,
        isSaving: false,
        lastSaveAt: 0,
        now,
      }),
    ).toBe(false);
  });

  it('ignores changes while a save is in flight', () => {
    expect(
      shouldReloadFromExternalChange({
        hasUnsavedChanges: false,
        isSaving: true,
        lastSaveAt: 0,
        now,
      }),
    ).toBe(false);
  });

  it('treats a change shortly after our save as our own echo', () => {
    expect(
      shouldReloadFromExternalChange({
        hasUnsavedChanges: false,
        isSaving: false,
        lastSaveAt: now - 400,
        now,
      }),
    ).toBe(false);
  });
});
