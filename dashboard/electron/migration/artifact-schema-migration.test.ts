import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  analyzeArtifactMigration,
  applyArtifactMigration,
  assertCleanGitCheckout,
  createArtifactMigrationSnapshot,
  recoverArtifactMigration,
} from './artifact-schema-migration';

const temporaryRoots: string[] = [];

async function createFixtureRoot(): Promise<{
  root: string;
  vaultRoot: string;
  snapshotRoot: string;
}> {
  const root = await mkdtemp(path.join(tmpdir(), 'myos-artifact-migration-'));
  temporaryRoots.push(root);
  const vaultRoot = path.join(root, 'vault');
  await mkdir(vaultRoot);
  return { root, vaultRoot, snapshotRoot: path.join(root, 'snapshot') };
}

async function writeFixture(
  vaultRoot: string,
  relativePath: string,
  frontmatter: string,
  body = '# Fixture\n',
): Promise<void> {
  const absolutePath = path.join(vaultRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `---\n${frontmatter.trim()}\n---\n${body}`, 'utf8');
}

async function hashFile(filePath: string): Promise<string> {
  return createHash('sha256').update(await readFile(filePath)).digest('hex');
}

async function fileInventory(root: string): Promise<Record<string, string>> {
  const inventory: Record<string, string> = {};
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (entry.name.startsWith('.artifact-migration-transaction-')) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
      else inventory[path.relative(root, fullPath).split(path.sep).join('/')] = await hashFile(fullPath);
    }
  }
  return inventory;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('artifact schema migration', () => {
  it('produces a stable report without changing the vault', async () => {
    const { vaultRoot } = await createFixtureRoot();
    await writeFixture(
      vaultRoot,
      'legacy/alpha.md',
      'id: alpha\ntitle: Alpha\ntype: memo\ntags: []\ncreated: 2026-01-01\nupdated: 2026-01-01\nstatus: active\nrelated: []',
    );
    await writeFixture(
      vaultRoot,
      'legacy/beta.md',
      'id: beta\ntitle: Beta\ntype: project\ndomain: personal\ntags: []\ncreated: 2026-01-01\nupdated: 2026-01-01\nstatus: active\nrelated: []',
    );
    const before = await fileInventory(vaultRoot);

    const first = await analyzeArtifactMigration(vaultRoot);
    const second = await analyzeArtifactMigration(vaultRoot);

    expect(second.report).toEqual(first.report);
    expect(first.report.cleanPreflight).toBe(true);
    expect(first.report.counts).toMatchObject({
      auditedArtifacts: 2,
      touchedArtifacts: 2,
      movedArtifacts: 2,
      frontmatterUpdates: 1,
    });
    expect(first.report.artifacts[0]).toMatchObject({
      id: 'alpha',
      action: 'move-and-rewrite',
      path: { before: 'legacy/alpha.md', after: 'work/memos/alpha.md' },
      frontmatterChanges: [{
        field: 'domain',
        before: { present: false },
        after: { present: true, value: 'work' },
      }],
    });
    expect(await fileInventory(vaultRoot)).toEqual(before);
  });

  it('keeps report/apply output in parity and is idempotent', async () => {
    const { vaultRoot, snapshotRoot } = await createFixtureRoot();
    await writeFixture(
      vaultRoot,
      'incoming/alpha.md',
      'id: alpha\ntitle: Alpha\ntype: memo\ntags: []\ncreated: 2026-01-01\nupdated: 2026-01-01\nstatus: active\nrelated: []',
    );
    await writeFixture(
      vaultRoot,
      'incoming/beta.md',
      'id: beta\ntitle: Beta\ntype: todo\ndomain: personal\ntags: []\ncreated: 2026-01-01\nupdated: 2026-01-01\nstatus: pending\nrelated: []',
    );
    const analysis = await analyzeArtifactMigration(vaultRoot);
    await createArtifactMigrationSnapshot(vaultRoot, snapshotRoot, analysis);

    const result = await applyArtifactMigration(vaultRoot, snapshotRoot, analysis);

    expect(result).toEqual({ movedArtifacts: 2, frontmatterUpdates: 1 });
    for (const item of analysis.report.artifacts) {
      expect(await hashFile(path.join(vaultRoot, item.path.after))).toBe(item.resultSha256);
      if (item.path.before !== item.path.after) expect(existsSync(path.join(vaultRoot, item.path.before))).toBe(false);
    }
    const repeated = await analyzeArtifactMigration(vaultRoot);
    expect(repeated.report.cleanPreflight).toBe(true);
    expect(repeated.report.counts.touchedArtifacts).toBe(0);
    expect(repeated.report.artifacts).toEqual([]);
  });

  it('refuses apply when a snapshot backup no longer matches its manifest', async () => {
    const { vaultRoot, snapshotRoot } = await createFixtureRoot();
    await writeFixture(
      vaultRoot,
      'legacy/alpha.md',
      'id: alpha\ntitle: Alpha\ntype: memo\ndomain: work\ntags: []\ncreated: 2026-01-01\nupdated: 2026-01-01\nstatus: active\nrelated: []',
    );
    const analysis = await analyzeArtifactMigration(vaultRoot);
    const before = await fileInventory(vaultRoot);
    await createArtifactMigrationSnapshot(vaultRoot, snapshotRoot, analysis);
    await writeFile(path.join(snapshotRoot, 'files/legacy/alpha.md'), 'tampered\n', 'utf8');

    await expect(
      applyArtifactMigration(vaultRoot, snapshotRoot, analysis),
    ).rejects.toThrow('Snapshot verification failed');
    expect(await fileInventory(vaultRoot)).toEqual(before);
  });

  it('reports duplicate IDs and destination collisions before writes', async () => {
    const { vaultRoot, snapshotRoot } = await createFixtureRoot();
    const sharedFrontmatter =
      'id: duplicate\ntitle: Duplicate\ntype: memo\ndomain: work\ntags: []\ncreated: 2026-01-01\nupdated: 2026-01-01\nstatus: active\nrelated: []';
    await writeFixture(vaultRoot, 'legacy/one.md', sharedFrontmatter);
    await writeFixture(vaultRoot, 'legacy/two.md', sharedFrontmatter);
    await writeFixture(vaultRoot, 'work/memos/duplicate.md', 'title: Occupied\ntype: unknown');
    const before = await fileInventory(vaultRoot);

    const analysis = await analyzeArtifactMigration(vaultRoot);

    expect(analysis.report.cleanPreflight).toBe(false);
    expect(analysis.report.issues.duplicateIds).toEqual([{
      id: 'duplicate',
      paths: ['legacy/one.md', 'legacy/two.md'],
    }]);
    expect(analysis.report.issues.destinationCollisions).toContainEqual({
      destination: 'work/memos/duplicate.md',
      sources: ['legacy/one.md', 'legacy/two.md'],
      reason: 'multiple-sources',
    });
    await expect(
      createArtifactMigrationSnapshot(vaultRoot, snapshotRoot, analysis),
    ).rejects.toThrow('preflight failed');
    expect(await fileInventory(vaultRoot)).toEqual(before);
  });

  it('refuses a destination occupied by a file outside the move set', async () => {
    const { vaultRoot } = await createFixtureRoot();
    await writeFixture(
      vaultRoot,
      'legacy/alpha.md',
      'id: alpha\ntitle: Alpha\ntype: memo\ndomain: work\ntags: []\ncreated: 2026-01-01\nupdated: 2026-01-01\nstatus: active\nrelated: []',
    );
    await writeFixture(vaultRoot, 'work/memos/alpha.md', 'title: Occupied\ntype: unknown');

    const analysis = await analyzeArtifactMigration(vaultRoot);

    expect(analysis.report.cleanPreflight).toBe(false);
    expect(analysis.report.issues.destinationCollisions).toEqual([{
      destination: 'work/memos/alpha.md',
      sources: ['legacy/alpha.md', 'work/memos/alpha.md'],
      reason: 'existing-file',
    }]);
  });

  it('recovers an interrupted apply from the verified snapshot', async () => {
    const { vaultRoot, snapshotRoot } = await createFixtureRoot();
    await writeFixture(
      vaultRoot,
      'legacy/alpha.md',
      'id: alpha\ntitle: Alpha\ntype: memo\ntags: []\ncreated: 2026-01-01\nupdated: 2026-01-01\nstatus: active\nrelated: []',
    );
    await writeFixture(
      vaultRoot,
      'legacy/beta.md',
      'id: beta\ntitle: Beta\ntype: project\ndomain: work\ntags: []\ncreated: 2026-01-01\nupdated: 2026-01-01\nstatus: active\nrelated: []',
    );
    const before = await fileInventory(vaultRoot);
    const analysis = await analyzeArtifactMigration(vaultRoot);
    await createArtifactMigrationSnapshot(vaultRoot, snapshotRoot, analysis);

    await expect(applyArtifactMigration(vaultRoot, snapshotRoot, analysis, {
      recoverOnFailure: false,
      onArtifactCommitted: (_item, index) => {
        if (index === 0) throw new Error('simulated interruption');
      },
    })).rejects.toThrow('simulated interruption');

    const recovery = await recoverArtifactMigration(vaultRoot, snapshotRoot);
    expect(recovery).toEqual({ restoredArtifacts: 2 });
    expect(await fileInventory(vaultRoot)).toEqual(before);
    expect((await analyzeArtifactMigration(vaultRoot)).report).toEqual(analysis.report);
  });

  it('automatically restores the snapshot after a handled apply failure', async () => {
    const { vaultRoot, snapshotRoot } = await createFixtureRoot();
    await writeFixture(
      vaultRoot,
      'legacy/alpha.md',
      'id: alpha\ntitle: Alpha\ntype: memo\ntags: []\ncreated: 2026-01-01\nupdated: 2026-01-01\nstatus: active\nrelated: []',
    );
    const before = await fileInventory(vaultRoot);
    const analysis = await analyzeArtifactMigration(vaultRoot);
    await createArtifactMigrationSnapshot(vaultRoot, snapshotRoot, analysis);

    await expect(applyArtifactMigration(vaultRoot, snapshotRoot, analysis, {
      onArtifactCommitted: () => {
        throw new Error('simulated handled failure');
      },
    })).rejects.toThrow('failed and was recovered from snapshot');

    expect(await fileInventory(vaultRoot)).toEqual(before);
    expect((await analyzeArtifactMigration(vaultRoot)).report).toEqual(analysis.report);
  });

  it('refuses apply when the containing git checkout is dirty', async () => {
    const { root, vaultRoot } = await createFixtureRoot();
    await writeFile(path.join(vaultRoot, 'tracked.md'), 'tracked\n', 'utf8');
    execFileSync('git', ['init', '-q'], { cwd: root });
    execFileSync('git', ['config', 'user.email', 'migration-test@example.invalid'], { cwd: root });
    execFileSync('git', ['config', 'user.name', 'Migration Test'], { cwd: root });
    execFileSync('git', ['add', '.'], { cwd: root });
    execFileSync('git', ['commit', '-qm', 'fixture'], { cwd: root });
    await expect(assertCleanGitCheckout(vaultRoot)).resolves.toBeUndefined();

    await writeFile(path.join(root, 'untracked.txt'), 'dirty\n', 'utf8');
    await expect(assertCleanGitCheckout(vaultRoot)).rejects.toThrow('requires a clean git checkout');
  });
});
