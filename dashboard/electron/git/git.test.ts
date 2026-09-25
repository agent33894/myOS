import { execFileSync } from 'child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// The open folder is `docs/` inside a repository, as when a project's docs are opened.
const repo = realpathSync(mkdtempSync(join(tmpdir(), 'myos-git-')));
const folder = join(repo, 'docs');
vi.mock('../workspace/root', () => ({ workspaceRoot: () => folder }));
const { gitCommit, gitDiff, gitInit, gitLog, gitPush, gitShow, gitStatus } = await import('./git');

const run = (...args: string[]) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' });

beforeAll(() => {
  mkdirSync(folder);
  run('init', '--quiet', '--initial-branch=main');
  run('config', 'user.name', 'Test');
  run('config', 'user.email', 'test@example.com');
  run('config', 'commit.gpgsign', 'false');
  writeFileSync(join(repo, 'outside.txt'), 'not in the folder\n');
  writeFileSync(join(folder, 'plan.md'), '# Plan\n');
  writeFileSync(join(folder, '-rf.md'), 'dash\n');
  writeFileSync(join(folder, ':(glob)*.md'), 'magic\n');
});
const remote = realpathSync(mkdtempSync(join(tmpdir(), 'myos-remote-')));
afterAll(() => {
  rmSync(repo, { recursive: true, force: true });
  rmSync(remote, { recursive: true, force: true });
});

describe('git in the open folder', () => {
  it('lists changes inside the folder only, with folder-relative paths', async () => {
    const status = await gitStatus();
    expect(status).toMatchObject({ repo: true, branch: 'main', ahead: 0, behind: 0 });
    expect(status.files.map((file) => [file.path, file.change]).sort()).toEqual([
      ['-rf.md', 'untracked'],
      [':(glob)*.md', 'untracked'],
      ['plan.md', 'untracked'],
    ]);
  });

  it('commits only the chosen files, treating odd names as plain paths', async () => {
    const hash = await gitCommit('Add the plan', ['plan.md', '-rf.md']);
    expect(hash).toMatch(/^[0-9a-f]{40}$/);
    expect(run('show', '--name-only', '--format=', 'HEAD').trim().split('\n').sort()).toEqual(['docs/-rf.md', 'docs/plan.md']);
    expect((await gitStatus()).files.map((file) => file.path)).toEqual([':(glob)*.md']);
    expect(run('status', '--porcelain')).toContain('outside.txt');
  });

  it('reads history, old text, and diffs', async () => {
    writeFileSync(join(folder, 'plan.md'), '# Plan\n\nMore\n');
    expect((await gitStatus()).files.find((file) => file.path === 'plan.md')).toMatchObject({ change: 'modified', staged: false });
    expect(await gitDiff('plan.md')).toContain('+More');
    expect(await gitDiff(':(glob)*.md')).toContain('+magic');
    const [commit] = await gitLog('plan.md');
    expect(commit).toMatchObject({ subject: 'Add the plan', author: 'Test' });
    expect(await gitShow('plan.md', commit.hash)).toBe('# Plan\n');
    await gitCommit('Everything');
    expect((await gitStatus()).files).toEqual([]);
    expect(run('status', '--porcelain')).toContain('outside.txt');
  });

  it('follows a renamed file back to its old name, and never nests a new repository', async () => {
    run('mv', 'docs/plan.md', 'docs/roadmap.md');
    await gitCommit('Rename the plan');
    const commits = await gitLog('roadmap.md');
    expect(commits[0]).not.toHaveProperty('path');
    const old = commits.find((commit) => commit.subject === 'Add the plan');
    expect(old?.path).toBe('plan.md');
    expect(await gitShow(old!.path!, old!.hash)).toBe('# Plan\n');
    await expect(gitInit()).rejects.toMatchObject({ code: 'INVALID' });
  });

  it('refuses paths outside the folder and anything that is not a hash', async () => {
    await expect(gitCommit('x', ['../outside.txt'])).rejects.toMatchObject({ code: 'OUTSIDE_WORKSPACE' });
    await expect(gitShow('roadmap.md', '--output=/tmp/pwned')).rejects.toMatchObject({ code: 'INVALID' });
    await expect(gitShow('roadmap.md', 'HEAD')).rejects.toMatchObject({ code: 'INVALID' });
    await expect(gitCommit('   ')).rejects.toMatchObject({ code: 'INVALID' });
    await expect(gitCommit('nothing to do', ['roadmap.md'])).rejects.toMatchObject({ code: 'GIT' });
  });

  it('pushes a branch without upstream to origin and tracks it there', async () => {
    execFileSync('git', ['init', '--quiet', '--bare', remote]);
    run('remote', 'add', 'origin', remote);
    expect(await gitStatus()).toMatchObject({ upstream: null, hasOrigin: true });
    await gitPush(true);
    expect(await gitStatus()).toMatchObject({ upstream: 'origin/main', ahead: 0 });
  });
});
