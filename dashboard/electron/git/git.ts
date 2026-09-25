import { execFile } from 'child_process';
import { promisify } from 'util';
import type { CommitFileStat, CommitSummary, GitChange, GitCommit, GitFileStatus, GitStatus } from '../../shared/ipc/contracts';
import { DomainError } from '../errors';
import { resolveInWorkspace, toWorkspacePath } from '../workspace/paths';
import { workspaceRoot } from '../workspace/root';

const execFileAsync = promisify(execFile);

const LOCAL_TIMEOUT_MS = 20_000;
const NETWORK_TIMEOUT_MS = 120_000;
const HASH = /^[0-9a-f]{4,64}$/i;

/*
 * Git runs as `git <args>` through execFile in the open folder: no shell, so
 * nothing in a path or message is ever interpreted. Paths are checked by
 * resolveInWorkspace and passed after `--` with literal pathspecs, so a file
 * named `-x` or `:(glob)*` is only ever a file name. Nothing here touches the
 * network except pull and push, which run only when asked.
 */
async function git(args: string[], { timeout = LOCAL_TIMEOUT_MS, okCodes = [0], withProgress = false } = {}): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync('git', ['--literal-pathspecs', '-c', 'core.quotepath=off', ...args], {
      cwd: workspaceRoot(),
      timeout,
      maxBuffer: 32 * 1024 * 1024,
      env: {
        ...process.env,
        // Fail instead of waiting for a password prompt nobody can see.
        GIT_TERMINAL_PROMPT: '0',
        GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND ?? 'ssh -o BatchMode=yes',
        GIT_OPTIONAL_LOCKS: '0',
      },
    });
    // Pull and push report on stderr.
    return withProgress ? `${stdout}\n${stderr}`.trim() : stdout;
  } catch (error) {
    const failure = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string; killed?: boolean; code?: number | string };
    if (typeof failure.code === 'number' && okCodes.includes(failure.code)) return failure.stdout ?? '';
    if (failure.code === 'ENOENT') throw new DomainError('GIT', 'Git is not installed or not on the PATH.');
    if (failure.killed) throw new DomainError('GIT', `git ${args[0]} took too long and was stopped.`);
    throw new DomainError('GIT', (failure.stderr || failure.stdout || failure.message).trim());
  }
}

/** A folder-relative path as a pathspec; throws for anything outside the folder. */
function pathspec(path: string): string {
  if (typeof path !== 'string' || !path.trim()) throw new DomainError('INVALID', 'A path is required.');
  return toWorkspacePath(resolveInWorkspace(path)) || '.';
}

function checkHash(hash: string): string {
  if (typeof hash !== 'string' || !HASH.test(hash.trim())) throw new DomainError('INVALID', 'That is not a commit hash.');
  return hash.trim();
}

/** Where the open folder sits inside its repository (`docs/`, or empty at the top); null outside a repository. */
async function repoPrefix(): Promise<string | null> {
  try {
    return (await git(['rev-parse', '--show-prefix'])).trim();
  } catch {
    return null;
  }
}

const CHANGE: Record<string, GitChange> = { M: 'modified', T: 'modified', A: 'added', C: 'added', D: 'deleted', R: 'renamed' };

/** Parse `git status --porcelain=v2 --branch -z`; paths come relative to the repository root and lose `prefix`. */
export function parseStatus(output: string, prefix: string): GitStatus {
  const status: GitStatus = { repo: true, branch: null, upstream: null, ahead: 0, behind: 0, files: [] };
  const local = (path: string) => (path.startsWith(prefix) ? path.slice(prefix.length) : path);
  const records = output.split('\0');
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (record.startsWith('# branch.head ')) {
      const head = record.slice(14);
      status.branch = head === '(detached)' ? null : head;
    } else if (record.startsWith('# branch.upstream ')) {
      status.upstream = record.slice(18);
    } else if (record.startsWith('# branch.ab ')) {
      const [, ahead, behind] = /\+(\d+) -(\d+)/.exec(record) ?? [];
      status.ahead = Number(ahead ?? 0);
      status.behind = Number(behind ?? 0);
    } else if (record.startsWith('? ')) {
      status.files.push({ path: local(record.slice(2)), change: 'untracked', staged: false });
    } else if (/^[12u] /.test(record)) {
      const fields = record.split(' ');
      const xy = fields[1];
      const kind = record[0];
      const path = fields.slice(kind === '1' ? 8 : kind === '2' ? 9 : 10).join(' ');
      const file: GitFileStatus = {
        path: local(path),
        change: kind === 'u' ? 'conflicted' : kind === '2' ? 'renamed' : CHANGE[xy[1] !== '.' ? xy[1] : xy[0]] ?? 'modified',
        staged: kind !== 'u' && xy[0] !== '.',
      };
      // A rename's original path is the next record.
      if (kind === '2') file.from = local(records[(index += 1)]);
      status.files.push(file);
    }
  }
  return status;
}

export async function gitStatus(): Promise<GitStatus> {
  const prefix = await repoPrefix();
  if (prefix === null) return { repo: false, branch: null, upstream: null, ahead: 0, behind: 0, files: [] };
  return parseStatus(await git(['status', '--porcelain=v2', '--branch', '-z', '--untracked-files=all', '--', '.']), prefix);
}

/** Commit `paths`, or every change in the folder, with `message`. Returns the new commit's hash. */
export async function gitCommit(message: string, paths?: string[]): Promise<string> {
  if (typeof message !== 'string' || !message.trim()) throw new DomainError('INVALID', 'A commit needs a message.');
  if (paths !== undefined && (!Array.isArray(paths) || paths.length === 0)) throw new DomainError('INVALID', 'Choose at least one file to commit.');
  const specs = paths ? paths.map(pathspec) : ['.'];
  await git(['add', '--all', '--', ...specs]);
  await git(['commit', '--message', message.trim(), '--', ...specs]);
  return (await git(['rev-parse', 'HEAD'])).trim();
}

const FIELD = '\x1f';
const RECORD = '\x1e';

export async function gitLog(path?: string, limit = 50): Promise<GitCommit[]> {
  const count = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 1000) : 50;
  const target = path === undefined ? ['.'] : [pathspec(path)];
  let output: string;
  try {
    output = await git(['log', `--max-count=${count}`, `--format=%H${FIELD}%aI${FIELD}%an${FIELD}%s${RECORD}`, ...(path ? ['--follow'] : []), '--', ...target]);
  } catch (error) {
    // A repository without commits has no history yet.
    if (error instanceof DomainError && /does not have any commits|bad default revision/i.test(error.message)) return [];
    throw error;
  }
  return output
    .split(RECORD)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [hash, date, author, subject] = entry.split(FIELD);
      return { hash, date, author, subject };
    });
}

/** The file's text at `hash`. */
export const gitShow = async (path: string, hash: string): Promise<string> => git(['show', `${checkHash(hash)}:./${pathspec(path)}`]);

/** The working tree against HEAD, for one file (untracked files show as added) or the whole folder. */
export async function gitDiff(path?: string): Promise<string> {
  const spec = path === undefined ? '.' : pathspec(path);
  if (path !== undefined && !(await git(['ls-files', '--', spec])).trim()) {
    return git(['diff', '--no-index', '--', '/dev/null', spec], { okCodes: [1] });
  }
  try {
    return await git(['diff', 'HEAD', '--', spec]);
  } catch {
    // No commits yet: everything staged or not is new.
    return git(['diff', '--', spec]);
  }
}

export const gitCommitDiff = async (hash: string): Promise<string> => git(['show', '--format=', checkHash(hash), '--']);

export async function gitCommitSummary(hash: string): Promise<CommitSummary> {
  const [full = '', message = '', author = '', date = '', ...rest] = (await git(['show', '--stat', '--format=%H%n%s%n%an%n%aI', checkHash(hash), '--'])).split('\n');
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

export const gitPull = (): Promise<string> => git(['pull', '--rebase', '--autostash'], { timeout: NETWORK_TIMEOUT_MS, withProgress: true });

export const gitPush = (): Promise<string> => git(['push'], { timeout: NETWORK_TIMEOUT_MS, withProgress: true });
