import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import matter from 'gray-matter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ArtifactStatus,
  ArtifactType,
  Domain,
  TodoStatus,
  type Artifact,
} from '../../../../shared/types';
import { getDefaultStatusForType } from '../../../../shared/spec';

let vaultPath = '';

vi.mock('../../../utils/paths.js', () => ({
  getVaultPath: () => vaultPath,
}));

import {
  deleteArtifact,
  promoteInboxItem,
  updateArtifact,
} from '../artifact-write';
import { artifactToMarkdown } from '../artifact-format';

function createVaultFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'myos-vault-'));
  mkdirSync(join(root, 'work', 'memos'), { recursive: true });
  mkdirSync(join(root, 'inbox'), { recursive: true });
  return root;
}

function buildArtifact(overrides: Partial<Artifact> = {}): Artifact {
  return {
    id: 'memo-1',
    title: 'Memo 1',
    type: ArtifactType.MEMO,
    domain: Domain.WORK,
    tags: ['notes'],
    project: undefined,
    created: '2026-02-01',
    updated: '2026-02-01',
    status: ArtifactStatus.ACTIVE,
    related: [],
    filePath: 'work/memos/memo-1.md',
    content: 'Original body',
    ...overrides,
  };
}

describe('artifact-write update hardening', () => {
  beforeEach(() => {
    vaultPath = createVaultFixture();
  });

  afterEach(() => {
    if (vaultPath) {
      rmSync(vaultPath, { recursive: true, force: true });
    }
    vaultPath = '';
  });

  it('fails update when target file is missing and does not create it', async () => {
    const relativePath = 'work/memos/missing.md';
    const missingPath = join(vaultPath, relativePath);

    await expect(
      updateArtifact(
        relativePath,
        buildArtifact({
          id: 'missing',
          filePath: relativePath,
          title: 'Missing Artifact',
          content: 'new content',
        })
      )
    ).rejects.toThrow('Artifact changed or missing; refresh and retry.');

    expect(existsSync(missingPath)).toBe(false);
  });

  it('preserves existing body when update content is blank', async () => {
    const existing = buildArtifact({
      id: 'existing-memo',
      filePath: 'work/memos/existing-memo.md',
      content: 'Persisted body',
    });
    const existingPath = join(vaultPath, existing.filePath);
    writeFileSync(existingPath, artifactToMarkdown(existing), 'utf-8');

    const updated = await updateArtifact(existing.filePath, {
      ...existing,
      title: 'Existing Memo Updated',
      content: '   ',
    });

    expect(updated.content).toBe('Persisted body');

    const persisted = matter(readFileSync(existingPath, 'utf-8'));
    expect(persisted.content.trim()).toBe('Persisted body');
  });

  it('never rewrites an existing project document to the new brief scaffold', async () => {
    mkdirSync(join(vaultPath, 'work', 'projects'), { recursive: true });
    const legacyBody =
      '# Legacy Project\n\n## Overview\nOld overview\n\n## Goals\n- old goal\n\n## Notes\nOld notes';
    const existing = buildArtifact({
      id: 'legacy-project',
      type: ArtifactType.PROJECT,
      filePath: 'work/projects/legacy-project.md',
      content: legacyBody,
    });
    const existingPath = join(vaultPath, existing.filePath);
    writeFileSync(existingPath, artifactToMarkdown(existing), 'utf-8');

    const updated = await updateArtifact(existing.filePath, {
      ...existing,
      title: 'Legacy Project Renamed',
      content: '',
    });

    expect(updated.content).toContain('## Overview');
    expect(updated.content).toContain('- old goal');
    expect(updated.content).not.toContain('## Intent');

    const persisted = matter(readFileSync(existingPath, 'utf-8'));
    expect(persisted.content).toContain('Old overview');
    expect(persisted.content).not.toContain('## Intent');
  });

  it('preserves legacy project due frontmatter exactly across unrelated updates', async () => {
    mkdirSync(join(vaultPath, 'work', 'projects'), { recursive: true });
    const existing = buildArtifact({
      id: 'legacy-due-project',
      type: ArtifactType.PROJECT,
      filePath: 'work/projects/legacy-due-project.md',
      content: '## Overview\nStill here',
      due: '2026-01-31',
    });
    const existingPath = join(vaultPath, existing.filePath);
    writeFileSync(existingPath, artifactToMarkdown(existing), 'utf-8');

    const updated = await updateArtifact(existing.filePath, {
      ...existing,
      title: 'Legacy Due Project Renamed',
    });

    expect(updated.due).toBe('2026-01-31');
    const persisted = matter(readFileSync(existingPath, 'utf-8'));
    expect(String(persisted.data.due).slice(0, 10)).toBe('2026-01-31');
  });

  it('returns deterministic error when deleting a missing artifact', async () => {
    await expect(deleteArtifact('work/memos/missing-delete.md')).rejects.toThrow(
      'Artifact changed or missing; refresh and retry.'
    );
  });

  it('returns canonical normalized artifact metadata on update', async () => {
    const existing = buildArtifact({
      id: 'normalize-memo',
      filePath: 'work/memos/normalize-memo.md',
      content: 'Body',
    });
    const existingPath = join(vaultPath, existing.filePath);
    writeFileSync(existingPath, artifactToMarkdown(existing), 'utf-8');

    const updated = await updateArtifact(existing.filePath, {
      ...existing,
      status: TodoStatus.PENDING,
      domain: undefined,
      content: 'Updated body',
    });

    expect(updated.status).toBe(getDefaultStatusForType(ArtifactType.MEMO));
    expect(updated.domain).toBe(Domain.WORK);
    expect(updated.updated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('promotes inbox artifact and returns canonical new path while removing old file', async () => {
    const inboxArtifact: Artifact = {
      id: 'inbox-item-1',
      title: 'Inbox Item',
      type: ArtifactType.INBOX,
      domain: undefined,
      tags: [],
      project: undefined,
      created: '2026-02-01',
      updated: '2026-02-01',
      status: TodoStatus.PENDING,
      related: [],
      filePath: 'inbox/inbox-item-1.md',
      content: 'Inbox content',
    };

    const oldPath = join(vaultPath, inboxArtifact.filePath);
    writeFileSync(oldPath, artifactToMarkdown(inboxArtifact), 'utf-8');

    const promoted = await promoteInboxItem(inboxArtifact.filePath, {
      ...inboxArtifact,
      type: ArtifactType.MEMO,
      domain: Domain.WORK,
      status: ArtifactStatus.ACTIVE,
    });

    const newPath = join(vaultPath, promoted.filePath);

    expect(promoted.filePath).toBe('work/memos/inbox-item-1.md');
    expect(existsSync(oldPath)).toBe(false);
    expect(existsSync(newPath)).toBe(true);
  });

  it('normalizes invalid metadata when promoting inbox artifacts', async () => {
    const inboxArtifact: Artifact = {
      id: 'inbox-item-2',
      title: 'Inbox Meeting',
      type: ArtifactType.INBOX,
      domain: undefined,
      tags: [],
      project: undefined,
      created: '2026-02-01',
      updated: '2026-02-01',
      status: TodoStatus.PENDING,
      related: [],
      filePath: 'inbox/inbox-item-2.md',
      content: '',
    };

    const oldPath = join(vaultPath, inboxArtifact.filePath);
    writeFileSync(oldPath, artifactToMarkdown(inboxArtifact), 'utf-8');

    const promoted = await promoteInboxItem(inboxArtifact.filePath, {
      ...inboxArtifact,
      type: ArtifactType.MEETING,
      domain: Domain.PERSONAL,
      status: TodoStatus.PENDING,
      content: '',
    });

    expect(promoted.domain).toBe(Domain.WORK);
    expect(promoted.status).toBe(ArtifactStatus.ACTIVE);
    expect(promoted.filePath).toBe('work/meetings/inbox-item-2.md');
    expect(promoted.content.trim().length).toBeGreaterThan(0);
  });
});
