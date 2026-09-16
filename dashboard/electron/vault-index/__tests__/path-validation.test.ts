import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { realpath as realpathCb, stat as statCb } from 'fs';
import { promisify } from 'util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validateIndexPath, type ValidationFs } from '../path-validation';

const realpathAsync = promisify(realpathCb);
const statAsync = promisify(statCb);

function realFs(): ValidationFs {
  return {
    exists: async (p) => {
      try {
        await statAsync(p);
        return true;
      } catch {
        return false;
      }
    },
    realpath: (p) => realpathAsync(p),
  };
}

describe('validateIndexPath', () => {
  let root = '';
  let rootReal = '';

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'myos-index-'));
    mkdirSync(join(root, 'work', 'memos'), { recursive: true });
    writeFileSync(join(root, 'work', 'memos', 'a.md'), 'hello', 'utf-8');
    rootReal = resolve(await realpathAsync(root));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    root = '';
  });

  function validate(candidate: string, fs: ValidationFs = realFs()) {
    return validateIndexPath({
      captureRoot: resolve(root),
      captureRootReal: rootReal,
      candidate,
      fs,
    });
  }

  it('accepts an in-vault file with vault-relative form', async () => {
    const result = await validate('work/memos/a.md');
    expect(result.ok).toBe(true);
    expect(result.validated?.absolutePath).toBe(join(resolve(root), 'work', 'memos', 'a.md'));
    expect(result.validated?.relativePath).toBe(join('work', 'memos', 'a.md'));
  });

  it('accepts a missing in-vault target anchored to an existing parent', async () => {
    const result = await validate('work/memos/new-note.md');
    expect(result.ok).toBe(true);
    expect(result.validated?.relativePath).toBe(join('work', 'memos', 'new-note.md'));
  });

  it('rejects empty and absolute candidates', async () => {
    expect((await validate('')).reason).toBe('empty-path');
    expect((await validate('   ')).reason).toBe('empty-path');
    expect((await validate('/etc/passwd')).reason).toBe('absolute-path');
  });

  it('accepts contained filenames beginning with dots', async () => {
    writeFileSync(join(root, '..draft.md'), 'draft', 'utf-8');
    mkdirSync(join(root, '..notes'), { recursive: true });
    writeFileSync(join(root, '..notes', 'file.md'), 'note', 'utf-8');

    const dotFile = await validate('..draft.md');
    expect(dotFile.ok).toBe(true);
    expect(dotFile.validated?.relativePath).toBe('..draft.md');

    const dotDir = await validate(join('..notes', 'file.md'));
    expect(dotDir.ok).toBe(true);
    expect(dotDir.validated?.relativePath).toBe(join('..notes', 'file.md'));
  });

  it('rejects lexical traversal and sibling-prefix escapes', async () => {
    expect((await validate('../outside.md')).reason).toBe('lexical-escape');
    expect((await validate('work/../../outside.md')).reason).toBe('lexical-escape');
    // Sibling directory sharing the root name prefix must not validate.
    const siblingName = `${root}-backup`;
    const lexical = await validateIndexPath({
      captureRoot: resolve(root),
      captureRootReal: rootReal,
      candidate: `../${siblingName.split('/').pop()}/x.md`,
      fs: realFs(),
    });
    expect(lexical.reason).toBe('lexical-escape');
  });

  it('rejects a symlinked file escaping the vault', async () => {
    const outside = mkdtempSync(join(tmpdir(), 'myos-index-outside-'));
    try {
      const outsideFile = join(outside, 'secret.md');
      writeFileSync(outsideFile, 'secret', 'utf-8');
      symlinkSync(outsideFile, join(root, 'work', 'memos', 'escaped.md'));
      const result = await validate('work/memos/escaped.md');
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('realpath-escape');
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('rejects targets under a symlinked directory escaping the vault', async () => {
    const outside = mkdtempSync(join(tmpdir(), 'myos-index-outside-dir-'));
    try {
      symlinkSync(outside, join(root, 'work', 'linked-outside'), 'dir');
      const result = await validate('work/linked-outside/new.md');
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('realpath-escape');
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('does not hang on symlink cycles; failure surfaces observably at read', async () => {
    // a -> b, b -> a cycle inside the vault.
    symlinkSync(join(root, 'work', 'cycle-b'), join(root, 'work', 'cycle-a'), 'dir');
    symlinkSync(join(root, 'work', 'cycle-a'), join(root, 'work', 'cycle-b'), 'dir');
    // Anchors to nearest existing parent (work/); no outside content is reachable.
    const result = await validate('work/cycle-a/note.md');
    expect(result.ok).toBe(true);
    expect(result.validated?.relativePath).toBe(join('work', 'cycle-a', 'note.md'));
    // Any real fs operation through the cycle fails instead of escaping.
    await expect(statAsync(result.validated!.absolutePath)).rejects.toThrow();
  });

  it('fails closed when the path disappears mid-validation', async () => {
    const vanishing: ValidationFs = {
      exists: async () => false,
      realpath: async () => {
        throw new Error('ENOENT');
      },
    };
    const result = await validate('work/memos/gone.md', vanishing);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('ancestor-missing');
  });

  it('bounds ancestor hops for adversarial missing paths', async () => {
    let existsCalls = 0;
    const counting: ValidationFs = {
      exists: async () => {
        existsCalls += 1;
        return false;
      },
      realpath: async () => {
        throw new Error('ENOENT');
      },
    };
    const result = await validateIndexPath({
      captureRoot: resolve(root),
      captureRootReal: rootReal,
      candidate: 'work/memos/deep.md',
      fs: counting,
      maxAncestorDepth: 3,
    });
    expect(result.ok).toBe(false);
    expect(existsCalls).toBeLessThanOrEqual(4);
  });
});
