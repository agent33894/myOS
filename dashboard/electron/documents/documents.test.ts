import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let root = '';
vi.mock('../workspace/root', () => ({ workspaceRoot: () => root }));

const { deleteArtifact, patchArtifact, readArtifact, restoreArtifact, saveArtifact } = await import('./artifacts');
const { parseDocument, serializeDocument } = await import('./markdown');

const stats = { mtimeMs: 1, size: 1, mtime: new Date('2026-01-02T03:04:05Z'), birthtime: new Date('2026-01-01T00:00:00Z') };

const CANONICAL = `---
id: launch-plan
title: Launch plan
type: todo
tags:
  - q3
created: '2026-01-01'
updated: '2026-01-02T03:04:05.000Z'
status: pending
related: []
domain: work
due: '2026-02-01'
flagged: true
order: 2
reviewer: Sam
checklist:
  - ship: false
---
# Launch plan

- [ ] Draft the announcement
`;

async function put(path: string, text: string) {
  await mkdir(join(root, path, '..'), { recursive: true });
  writeFileSync(join(root, path), text);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'myos-documents-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('round trip', () => {
  it('keeps known fields, custom frontmatter, and the body', () => {
    const parsed = parseDocument(CANONICAL, 'work/todos/launch-plan.md', stats);
    expect(parsed.extra).toEqual({ reviewer: 'Sam', checklist: [{ ship: false }] });
    expect(serializeDocument(parsed)).toBe(CANONICAL);
    expect(parseDocument(serializeDocument(parsed), parsed.filePath, stats)).toEqual(parsed);
  });

  it('keeps an empty body empty', () => {
    const empty = parseDocument(CANONICAL.replace(/---\n# Launch[\s\S]*$/, '---\n'), 'a.md', stats);
    expect(empty.content).toBe('');
    expect(parseDocument(serializeDocument(empty), 'a.md', stats).content).toBe('');
  });
});

describe('writes', () => {
  const path = 'work/todos/launch-plan.md';

  it('rejects a save made against a stale revision', async () => {
    await put(path, CANONICAL);
    const { rev } = await readArtifact(path);
    writeFileSync(join(root, path), CANONICAL.replace('Draft', 'Edited elsewhere: draft'));
    await expect(saveArtifact(path, { fields: {}, content: 'mine' }, rev)).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(readFileSync(join(root, path), 'utf8')).toContain('Edited elsewhere');
  });

  it('patches frontmatter without touching the body bytes', async () => {
    const body = '\n\n  Indented first line\n\n| a | b |\n|---|---|\nno trailing newline';
    await put(path, CANONICAL.replace(/# Launch[\s\S]*$/, body));
    const patched = await patchArtifact(path, { flagged: null, project: 'launch' });
    const text = readFileSync(join(root, path), 'utf8');
    expect(text.endsWith(`---\n${body}`)).toBe(true);
    expect(patched.flagged).toBeUndefined();
    expect(patched.project).toBe('launch');
    expect(patched.extra.reviewer).toBe('Sam');
  });

  it('writes back values it cannot use exactly as they were', async () => {
    await put('notes/book.md', '\uFEFF---\ntype: book\ndomain: hobby\nrelated: [[Some Note]]\ncreated: 1700000000\n---\nBody\n');
    const patched = await patchArtifact('notes/book.md', { tags: ['reading'] });
    expect(patched).toMatchObject({ type: 'memo', tags: ['reading'], content: 'Body' });
    const text = readFileSync(join(root, 'notes/book.md'), 'utf8');
    for (const line of ['type: book', 'domain: hobby', 'related:\n  - - Some Note', 'created: 1700000000']) {
      expect(text).toContain(`\n${line}\n`);
    }
    expect(text.endsWith('---\nBody\n')).toBe(true);
  });

  it('restores a deleted file byte for byte at the same path', async () => {
    const handWritten = '---\ntitle: Loose note   # a comment\ntags: [a, b]\n---\n\nBody\n';
    await put('notes/loose.md', handWritten);
    const snapshot = await deleteArtifact('notes/loose.md');
    const restored = await restoreArtifact(snapshot);
    expect(restored.filePath).toBe('notes/loose.md');
    expect(readFileSync(join(root, 'notes/loose.md'), 'utf8')).toBe(handWritten);
    await expect(restoreArtifact(snapshot)).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});
