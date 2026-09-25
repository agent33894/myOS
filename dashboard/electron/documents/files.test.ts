import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let root = '';
let appData = '';
vi.mock('../workspace/root', () => ({ workspaceRoot: () => root, currentWorkspace: () => root }));
vi.mock('electron', () => ({ app: { getPath: () => appData }, shell: {} }));

const files = await import('./files');
const tasks = await import('./tasks');

async function put(path: string, text: string) {
  await mkdir(join(root, path, '..'), { recursive: true });
  writeFileSync(join(root, path), text);
}
const read = (path: string) => readFileSync(join(root, path), 'utf8');

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'myos-files-'));
  appData = mkdtempSync(join(tmpdir(), 'myos-app-data-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(appData, { recursive: true, force: true });
});

describe('saving', () => {
  it('rejects a save made against a stale revision', async () => {
    await put('a.md', 'First\n');
    const { rev } = await files.readNote('a.md');
    writeFileSync(join(root, 'a.md'), 'Edited elsewhere\n');
    await expect(files.saveNote('a.md', { content: 'Mine' }, rev)).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(read('a.md')).toBe('Edited elsewhere\n');
  });

  it('restores earlier text only against the current revision, keeping the replaced text as a local copy', async () => {
    await put('a.md', '---\ntitle: A\n---\nNow\n');
    const { rev } = await files.readNote('a.md');
    await expect(files.restoreText('a.md', 'Old\n', 'stale')).rejects.toMatchObject({ code: 'CONFLICT' });
    await files.restoreText('a.md', 'Old\r\n', rev);
    expect(read('a.md')).toBe('Old\r\n');
    const [kept] = await files.listHistory('a.md');
    expect(await files.readHistory('a.md', kept.id)).toBe('---\ntitle: A\n---\nNow\n');
  });

  it('rewrites only the frontmatter lines that changed, and never touches the body for a property change', async () => {
    const head = "---\r\n# my note\r\ntitle: Garden plan\r\ntags: [b, a]\r\nreviewer: 'Sam'   # owner\r\ndue: 2026-02-01\r\n---\r\n";
    const body = '\r\n\r\n  Indented first line\r\n\r\n| a | b |\r\n|---|---|\r\nno trailing newline';
    await put('notes/garden.md', head + body);
    const note = await files.readNote('notes/garden.md');
    expect(note.properties).toEqual({ title: 'Garden plan', tags: ['b', 'a'], reviewer: 'Sam', due: '2026-02-01' });
    const patched = await files.saveNote('notes/garden.md', { properties: { due: null, status: 'active' } }, note.rev);
    expect(read('notes/garden.md')).toBe(
      "---\r\n# my note\r\ntitle: Garden plan\r\ntags: [b, a]\r\nreviewer: 'Sam'   # owner\r\nstatus: active\r\n---\r\n" + body,
    );
    await files.saveNote('notes/garden.md', { content: 'Second draft' }, patched.rev);
    expect(read('notes/garden.md').endsWith('---\r\n\r\n\r\nSecond draft')).toBe(true);
  });

  it('adds nothing to a plain file when only its body changes', async () => {
    await put('plain.md', '# Plain\n\nText');
    const plain = await files.readNote('plain.md');
    expect(plain.title).toBe('plain');
    await files.saveNote('plain.md', { content: '# Plain\n\nMore text' }, plain.rev);
    expect(read('plain.md')).toBe('# Plain\n\nMore text');
  });

  it('keeps unreadable frontmatter as it is and refuses to change its properties', async () => {
    await put('broken.md', '---\ntitle: [unclosed\n---\nBody\n');
    const broken = await files.readNote('broken.md');
    expect(broken.propertiesError).toBeTruthy();
    await expect(files.saveNote('broken.md', { properties: { a: 1 } }, broken.rev)).rejects.toMatchObject({ code: 'INVALID' });
    await files.saveNote('broken.md', { content: 'New body' }, broken.rev);
    expect(read('broken.md')).toBe('---\ntitle: [unclosed\n---\nNew body\n');
  });
});

describe('files and folders', () => {
  const handWritten = '---\ntitle: Loose note   # a comment\ntags: [a, b]\n---\n\n* bullet\n';

  it('creates without replacing, and restores a deleted file byte for byte', async () => {
    await put('notes/loose.md', handWritten);
    await expect(files.createNote('notes/loose.md', 'x')).rejects.toMatchObject({ code: 'CONFLICT' });
    const snapshot = await files.deleteNote('notes/loose.md');
    expect(existsSync(join(root, 'notes/loose.md'))).toBe(false);
    expect(await files.listHistory('notes/loose.md')).toHaveLength(1);
    await files.restoreNote(snapshot);
    expect(read('notes/loose.md')).toBe(handWritten);
    await expect(files.restoreNote(snapshot)).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('moves files with their bytes and history, never over another file', async () => {
    await put('a/one.md', handWritten);
    await put('b/two.md', 'someone else');
    const { rev } = await files.readNote('a/one.md');
    await files.saveNote('a/one.md', { content: 'Second draft' }, rev);
    const current = read('a/one.md');
    await expect(files.moveNote('a/one.md', 'b/two.md')).rejects.toMatchObject({ code: 'CONFLICT' });
    const moved = await files.moveNote('a/one.md', 'b/c/one.md');
    expect(moved.path).toBe('b/c/one.md');
    expect(read('b/c/one.md')).toBe(current);
    expect(await files.readHistory('b/c/one.md', (await files.listHistory('b/c/one.md'))[0].id)).toBe(handWritten);
  });

  it('moves and deletes folders, keeping a copy of every note first', async () => {
    await put('projects/api/plan.md', 'Plan\n');
    await put('projects/api/deep/notes.md', 'Notes\n');
    await files.createFolder('projects/empty');
    expect((await files.listFiles()).folders).toEqual(['projects', 'projects/api', 'projects/api/deep', 'projects/empty']);
    await expect(files.moveFolder('projects', 'projects/inside')).rejects.toMatchObject({ code: 'INVALID' });
    expect(await files.moveFolder('projects/api', 'archive/api')).toBe('archive/api');
    expect(read('archive/api/deep/notes.md')).toBe('Notes\n');
    expect(await files.deleteFolder('archive')).toEqual(['archive/api/plan.md', 'archive/api/deep/notes.md'].sort());
    expect(existsSync(join(root, 'archive'))).toBe(false);
    const [copy] = await files.listHistory('archive/api/plan.md');
    expect(await files.readHistory('archive/api/plan.md', copy.id)).toBe('Plan\n');
    await expect(files.deleteFolder('.')).rejects.toMatchObject({ code: 'INVALID' });
    await expect(files.createNote('.git/config.md')).rejects.toMatchObject({ code: 'INVALID' });
  });
});

describe('task edits on disk', () => {
  it('toggles against the revision and the exact line', async () => {
    await put('todo.md', '# List\n- [ ] One\n- [ ] Two\n');
    const note = await files.readNote('todo.md');
    const [one] = note.tasks;
    const done = await tasks.toggleTask(one, note.rev, '2026-09-25');
    expect(read('todo.md')).toBe('# List\n- [x] One ✅ 2026-09-25\n- [ ] Two\n');
    await expect(tasks.toggleTask(one, note.rev)).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(tasks.toggleTask(one, done.rev)).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('checks off a type: todo file through its status', async () => {
    await put('call.md', '---\ntype: todo\nstatus: pending\n---\nBody\n');
    const note = await files.readNote('call.md');
    await tasks.toggleTask(note.tasks[0], note.rev, '2026-09-25');
    expect(read('call.md')).toBe('---\ntype: todo\nstatus: done\ncompletedDate: 2026-09-25\n---\nBody\n');
  });

  it('appends lines, making the file when needed', async () => {
    await tasks.appendToFile('daily/2026-09-25.md', '- [ ] First', 'Log');
    await tasks.appendToFile('daily/2026-09-25.md', '- second', 'Log');
    expect(read('daily/2026-09-25.md')).toBe('## Log\n- [ ] First\n- second\n');
  });
});
