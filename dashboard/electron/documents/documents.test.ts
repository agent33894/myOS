import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Domain } from '../../shared/types';

let root = '';
let appData = '';
vi.mock('../workspace/root', () => ({ workspaceRoot: () => root }));
vi.mock('electron', () => ({ app: { getPath: () => appData } }));

const {
  deleteArtifact,
  listHistory,
  moveArtifact,
  moveToArea,
  patchArtifact,
  readArtifact,
  readHistory,
  renameArtifact,
  restoreArtifact,
  restoreVersion,
  saveArtifact,
} = await import('./artifacts');
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
  appData = mkdtempSync(join(tmpdir(), 'myos-app-data-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(appData, { recursive: true, force: true });
});

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

  it('rewrites only the frontmatter lines that changed', async () => {
    const head = "---\r\n# my note\r\ntitle: Garden plan\r\ntags: [b, a]\r\nupdated: 2026-01-02\r\nreviewer: 'Sam'   # owner\r\ndue: 2026-02-01\r\n---\r\n";
    await put('notes/garden.md', `${head}\r\nBody\r\n`);
    const { rev } = await readArtifact('notes/garden.md');
    await saveArtifact('notes/garden.md', { fields: {}, content: 'Second draft' }, rev);
    const saved = readFileSync(join(root, 'notes/garden.md'), 'utf8');
    expect(saved.replace(/updated: .*\r\n/, 'updated: 2026-01-02\r\n')).toBe(`${head}\r\nSecond draft\r\n`);

    await patchArtifact('notes/garden.md', { due: null, flagged: true });
    const patched = readFileSync(join(root, 'notes/garden.md'), 'utf8');
    expect(patched).toMatch(/^---\r\n# my note\r\ntitle: Garden plan\r\ntags: \[b, a\]\r\nupdated: [^\r]+\r\nreviewer: 'Sam' {3}# owner\r\nflagged: true\r\n---\r\n\r\nSecond draft\r\n$/);

    // Plain Markdown stays plain while only its body changes.
    await put('notes/plain.md', '# Plain\n\nText');
    const plain = await readArtifact('notes/plain.md');
    await saveArtifact('notes/plain.md', { fields: {}, content: '# Plain\n\nMore text' }, plain.rev);
    expect(readFileSync(join(root, 'notes/plain.md'), 'utf8')).toBe('# Plain\n\nMore text');
  });

  it('writes back values it cannot use exactly as they were', async () => {
    await put('notes/book.md', '\uFEFF---\ntype: book\ndomain: hobby\nrelated: [[Some Note]]\ncreated: 1700000000\n---\nBody\n');
    const patched = await patchArtifact('notes/book.md', { tags: ['reading'] });
    expect(patched).toMatchObject({ type: 'memo', tags: ['reading'], content: 'Body' });
    const text = readFileSync(join(root, 'notes/book.md'), 'utf8');
    for (const line of ['type: book', 'domain: hobby', 'related: [[Some Note]]', 'created: 1700000000']) {
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

describe('moves and versions', () => {
  const handWritten = '---\ntitle: Garden plan\ndomain: work\ncustom: [x]\n---\n\n* bullet\n';
  const read = (path: string) => readFileSync(join(root, path), 'utf8');

  it('renames a file after its title with its bytes unchanged, and never over another file', async () => {
    await put('work/memos/untitled-abc.md', handWritten);
    await put('work/memos/garden-plan.md', 'someone else');
    const renamed = await renameArtifact('work/memos/untitled-abc.md');
    expect(renamed.filePath).toBe('work/memos/garden-plan-2.md');
    expect(read(renamed.filePath)).toBe(handWritten);
    expect(read('work/memos/garden-plan.md')).toBe('someone else');
    expect(existsSync(join(root, 'work/memos/untitled-abc.md'))).toBe(false);
    expect((await renameArtifact(renamed.filePath)).filePath).toBe(renamed.filePath);
    // A name that merely ends in a number follows the title once that number leaves it.
    await put('work/memos/kitchen-renovation-2026.md', '---\ntitle: Kitchen renovation\n---\n');
    expect((await renameArtifact('work/memos/kitchen-renovation-2026.md')).filePath).toBe('work/memos/kitchen-renovation.md');
    // Undo moves it back exactly.
    const back = await moveArtifact(renamed.filePath, 'work/memos/untitled-abc.md');
    expect(read(back.filePath)).toBe(handWritten);
    await expect(moveArtifact(back.filePath, 'work/memos/garden-plan.md')).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('moves a file to another area, changing only its domain', async () => {
    await put('work/memos/garden.md', handWritten);
    const moved = await moveToArea('work/memos/garden.md', Domain.PERSONAL);
    expect(moved.filePath).toBe('personal/memos/garden.md');
    expect(read(moved.filePath)).toContain('domain: personal');
    expect(read(moved.filePath).endsWith('---\n\n* bullet\n')).toBe(true);
    expect(moved.extra.custom).toEqual(['x']);
    expect(existsSync(join(root, 'work/memos/garden.md'))).toBe(false);
    // The folder it left empty goes too; the workspace itself never does.
    expect(existsSync(join(root, 'work'))).toBe(false);
    expect(existsSync(root)).toBe(true);
  });

  it('keeps versions across a move and restores one without losing the current text', async () => {
    const path = 'work/memos/garden.md';
    await put(path, handWritten);
    const { rev } = await readArtifact(path);
    await saveArtifact(path, { fields: {}, content: 'Second draft' }, rev);
    const moved = await moveToArea(path, Domain.PERSONAL);
    const versions = await listHistory(moved.filePath);
    expect(versions).toHaveLength(2);
    const [beforeMove, original] = versions;
    expect(await readHistory(moved.filePath, original.id)).toBe(handWritten);
    await expect(readHistory(moved.filePath, '../../etc/passwd')).rejects.toMatchObject({ code: 'NOT_FOUND' });

    const current = read(moved.filePath);
    await restoreVersion(moved.filePath, original.id, moved.rev);
    expect(read(moved.filePath)).toBe(handWritten);
    const after = await listHistory(moved.filePath);
    expect(await readHistory(moved.filePath, after[0].id)).toBe(current);
    expect(beforeMove.id <= after[0].id).toBe(true);
  });
});
