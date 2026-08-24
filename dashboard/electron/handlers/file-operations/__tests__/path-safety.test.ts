import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let vaultPath = '';

vi.mock('../../../utils/paths.js', () => ({
  getVaultPath: () => vaultPath,
}));

import { resolvePathWithinVault } from '../path-safety';

function createVaultFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'myos-vault-'));
  mkdirSync(join(root, 'work', 'memos'), { recursive: true });
  mkdirSync(join(root, 'inbox'), { recursive: true });
  return root;
}

describe('resolvePathWithinVault', () => {
  beforeEach(() => {
    vaultPath = createVaultFixture();
  });

  afterEach(() => {
    if (vaultPath) {
      rmSync(vaultPath, { recursive: true, force: true });
    }
    vaultPath = '';
  });

  it('resolves an existing in-vault file', () => {
    const relativePath = 'work/memos/in-vault.md';
    const absolutePath = join(vaultPath, relativePath);
    writeFileSync(absolutePath, 'memo content', 'utf-8');

    expect(resolvePathWithinVault(relativePath)).toBe(absolutePath);
  });

  it('rejects symlinked files that escape the vault', () => {
    const outsideRoot = mkdtempSync(join(tmpdir(), 'myos-outside-'));
    const outsideFile = join(outsideRoot, 'outside.md');
    writeFileSync(outsideFile, 'outside', 'utf-8');

    const symlinkPath = join(vaultPath, 'work', 'memos', 'escaped.md');
    symlinkSync(outsideFile, symlinkPath);

    expect(() => resolvePathWithinVault('work/memos/escaped.md')).toThrow(
      'Path escapes vault boundary via symlink'
    );

    rmSync(outsideRoot, { recursive: true, force: true });
  });

  it('rejects non-existing targets under symlinked parent directories that escape', () => {
    const outsideRoot = mkdtempSync(join(tmpdir(), 'myos-outside-dir-'));
    const symlinkedDir = join(vaultPath, 'work', 'linked-outside');
    symlinkSync(outsideRoot, symlinkedDir, 'dir');

    expect(() =>
      resolvePathWithinVault('work/linked-outside/new-artifact.md')
    ).toThrow('Path escapes vault boundary via symlink');

    rmSync(outsideRoot, { recursive: true, force: true });
  });

  it('allows non-existing targets under legitimate in-vault parents', () => {
    const expected = join(vaultPath, 'work', 'memos', 'new-artifact.md');
    expect(resolvePathWithinVault('work/memos/new-artifact.md')).toBe(expected);
  });

  it('rejects traversal and absolute paths', () => {
    expect(() => resolvePathWithinVault('../outside.md')).toThrow(
      'Path escapes vault boundary'
    );
    expect(() => resolvePathWithinVault('/etc/passwd')).toThrow(
      'Absolute paths are not allowed for vault operations'
    );
  });
});
