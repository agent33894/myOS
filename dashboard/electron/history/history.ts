import { app } from 'electron';
import { createHash } from 'crypto';
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import type { VersionInfo } from '../../shared/ipc/contracts';
import { DomainError, isMissingFile } from '../errors';
import { workspaceRoot } from '../workspace/root';

const MIN_GAP_MS = 10 * 60_000;
const KEEP = 50;
const MAX_AGE_MS = 60 * 86_400_000;
// Snapshot ids are ISO timestamps with `:` and `.` swapped for `-`, safe in every file system.
const ID = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/;

const idOf = (date: Date) => date.toISOString().replace(/[:.]/g, '-');
const savedAtOf = (id: string) => id.replace(ID, '$1T$2:$3:$4.$5Z');

/**
 * Snapshots of one file, keyed by workspace so two folders never mix. They
 * live in the app's data directory, never inside the user's folder. `path`
 * is a validated workspace-relative path.
 */
function folderFor(path: string): string {
  const workspace = createHash('sha1').update(workspaceRoot()).digest('hex');
  return join(app.getPath('userData'), 'history', workspace, ...path.split('/'));
}

/** Snapshot ids, newest first. */
async function idsFor(path: string): Promise<string[]> {
  const names = await readdir(folderFor(path)).catch((error: unknown) => {
    if (isMissingFile(error)) return [] as string[];
    throw error;
  });
  return names
    .map((name) => name.replace(/\.md$/, ''))
    .filter((id) => ID.test(id))
    .sort()
    .reverse();
}

/**
 * Keep `raw`, the file as it is before a write. Throttled writes (saves) keep
 * at most one snapshot per ten minutes; an identical newest snapshot is never
 * repeated. Old snapshots are pruned here: the latest 50, none past 60 days.
 */
export async function snapshotBeforeWrite(path: string, raw: string, { throttle = false } = {}): Promise<void> {
  const folder = folderFor(path);
  const ids = await idsFor(path);
  const now = Date.now();
  const newest = ids[0];
  if (newest) {
    if (throttle && now - Date.parse(savedAtOf(newest)) < MIN_GAP_MS) return;
    if ((await readFile(join(folder, `${newest}.md`), 'utf-8')) === raw) return;
  }
  let stamp = now;
  while (ids.includes(idOf(new Date(stamp)))) stamp += 1;
  const id = idOf(new Date(stamp));
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, `${id}.md`), raw, 'utf-8');
  const stale = [id, ...ids.filter((existing) => existing !== id)].filter(
    (existing, index) => index >= KEEP || now - Date.parse(savedAtOf(existing)) > MAX_AGE_MS,
  );
  await Promise.all(stale.map((existing) => rm(join(folder, `${existing}.md`), { force: true })));
}

/** History follows a file that moved (rename, area, type); an existing history at the target stays. */
export async function moveHistory(from: string, to: string): Promise<void> {
  const target = folderFor(to);
  try {
    await stat(target);
    return;
  } catch {
    // Nothing there yet; move the history across.
  }
  try {
    await mkdir(dirname(target), { recursive: true });
    await rename(folderFor(from), target);
  } catch (error) {
    if (!isMissingFile(error)) console.warn(`Could not move history for ${from}:`, (error as Error).message);
  }
}

export async function listVersions(path: string): Promise<VersionInfo[]> {
  const folder = folderFor(path);
  return Promise.all(
    (await idsFor(path)).map(async (id) => ({ id, savedAt: savedAtOf(id), size: (await stat(join(folder, `${id}.md`))).size })),
  );
}

/** The full text of one snapshot; `id` must name a snapshot that exists. */
export async function readVersion(path: string, id: string): Promise<string> {
  if (!ID.test(id) || !(await idsFor(path)).includes(id)) throw new DomainError('NOT_FOUND', 'That version no longer exists.');
  return readFile(join(folderFor(path), `${id}.md`), 'utf-8');
}
