import { execFile } from 'child_process';
import { realpathSync } from 'fs';
import { homedir } from 'os';
import { resolve } from 'path';
import { promisify } from 'util';
import type { CommitFileStat, CommitSummary } from '../../shared/ipc/contracts';
import { listArtifacts } from '../documents/artifacts';
import { DomainError } from '../errors';
import { workspaceRoot } from '../workspace/root';

const execFileAsync = promisify(execFile);

const realpath = (path: string) => {
  try {
    return realpathSync(resolve(path.replace(/^~(?=$|\/)/, homedir())));
  } catch {
    return null;
  }
};

/** Git only runs in the workspace itself or a repository a project registered as its `localPath`. */
async function allowedRepo(repoPath: string): Promise<string> {
  const target = realpath(repoPath);
  const allowed = [
    workspaceRoot(),
    ...(await listArtifacts()).flatMap((artifact) => (artifact.type === 'project' && artifact.localPath ? [artifact.localPath] : [])),
  ];
  if (!target || !allowed.some((path) => realpath(path) === target)) {
    throw new DomainError('OUTSIDE_WORKSPACE', `${repoPath} is not the workspace or a linked project repository.`);
  }
  return target;
}

async function git(repoPath: string, hash: string, args: string[]): Promise<string> {
  if (!/^[a-f0-9]{4,40}$/i.test(hash.trim())) throw new DomainError('INVALID', 'Invalid commit hash.');
  const cwd = await allowedRepo(repoPath);
  try {
    const { stdout } = await execFileAsync('git', [...args, hash.trim()], { cwd, maxBuffer: 10 * 1024 * 1024 });
    return stdout;
  } catch (error) {
    throw new DomainError('NOT_FOUND', `git could not show ${hash}: ${(error as Error).message}`);
  }
}

export async function commitSummary(repoPath: string, hash: string): Promise<CommitSummary> {
  const [full = '', message = '', author = '', date = '', ...rest] = (
    await git(repoPath, hash, ['show', '--stat', '--format=%H%n%s%n%an%n%aI'])
  ).split('\n');
  const files: CommitFileStat[] = [];
  for (const line of rest) {
    // " src/file.ts | 10 ++++------" or " image.png | Bin 0 -> 1234 bytes"
    const change = line.match(/^\s+(.+?)\s+\|\s+\d+\s+(\+*)(-*)\s*$/);
    const binary = line.match(/^\s+(.+?)\s+\|\s+Bin/);
    if (change) files.push({ path: change[1], additions: change[2].length, deletions: change[3].length });
    else if (binary) files.push({ path: binary[1], additions: 0, deletions: 0 });
  }
  return {
    hash: full.trim(),
    message: message.trim(),
    author: author.trim(),
    date: date.trim(),
    files,
    totalAdditions: files.reduce((sum, file) => sum + file.additions, 0),
    totalDeletions: files.reduce((sum, file) => sum + file.deletions, 0),
  };
}

export async function commitDiff(repoPath: string, hash: string): Promise<string> {
  return git(repoPath, hash, ['show', '--format=']);
}
