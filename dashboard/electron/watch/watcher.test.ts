import { appendFileSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, expect, it, vi } from 'vitest';
import type { IpcEventMap } from '../../shared/ipc/contracts';

vi.mock('electron', () => ({ app: { getPath: () => tmpdir() } }));
const { watchWorkspace } = await import('./watcher');

type Change = IpcEventMap['files:changed'];
const root = mkdtempSync(join(tmpdir(), 'myos-watch-'));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

afterEach(() => {
  watchWorkspace(null, () => undefined);
  rmSync(root, { recursive: true, force: true });
});

it('keeps reporting a file after another program replaces it, and files in new folders', async () => {
  mkdirSync(join(root, 'sub'), { recursive: true });
  writeFileSync(join(root, 'sub/a.md'), 'one\n');
  const seen: Change[] = [];
  watchWorkspace(root, (change) => seen.push(change));
  await sleep(200);

  // What `sed -i` and most editors do: write a new file, then rename it over the old one.
  writeFileSync(join(root, 'sub/.a.md.tmp'), 'two\n');
  renameSync(join(root, 'sub/.a.md.tmp'), join(root, 'sub/a.md'));
  await sleep(400);
  seen.length = 0;
  appendFileSync(join(root, 'sub/a.md'), 'three\n');
  await sleep(400);
  expect(seen).toContainEqual(expect.objectContaining({ path: 'sub/a.md', entry: 'file' }));

  mkdirSync(join(root, 'new'));
  await sleep(400);
  seen.length = 0;
  writeFileSync(join(root, 'new/b.md'), 'b\n');
  await sleep(400);
  expect(seen).toContainEqual(expect.objectContaining({ path: 'new/b.md', entry: 'file' }));
  expect(seen.some((change) => change.path.includes('.tmp'))).toBe(false);

  // `mkdir -p` and a write right after: the file lands before the new folders are watched.
  seen.length = 0;
  mkdirSync(join(root, 'a/b'), { recursive: true });
  writeFileSync(join(root, 'a/b/c.md'), 'c\n');
  await sleep(600);
  expect(seen).toContainEqual(expect.objectContaining({ path: 'a/b/c.md', entry: 'file' }));
});
