import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, describe, expect, it, vi } from 'vitest';

vi.mock('./root', () => ({ workspaceRoot: () => '/unused' }));
const { resolveInWorkspace } = await import('./paths');

const scratch = mkdtempSync(join(tmpdir(), 'myos-paths-'));
const root = join(scratch, 'workspace');
mkdirSync(join(root, 'notes'), { recursive: true });
mkdirSync(join(scratch, 'secrets'));
symlinkSync(join(scratch, 'secrets'), join(root, 'escape'));

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe('resolveInWorkspace', () => {
  it('resolves paths inside the workspace, including files that do not exist yet', () => {
    expect(resolveInWorkspace('notes/new/today.md', root)).toMatch(/workspace\/notes\/new\/today\.md$/);
  });

  it.each(['../secrets/key.md', 'notes/../../secrets/key.md', '/etc/passwd', 'escape/key.md', 'escape/new/key.md'])(
    'rejects %s',
    (path) => {
      expect(() => resolveInWorkspace(path, root)).toThrow(expect.objectContaining({ code: 'OUTSIDE_WORKSPACE' }));
    },
  );
});
