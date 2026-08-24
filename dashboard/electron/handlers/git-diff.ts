import { execFile } from 'child_process';
import { existsSync, statSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import type { CommitFileStat, CommitSummary } from '../../shared/ipc/contracts';

const execFileAsync = promisify(execFile);
const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024;
const COMMIT_HASH_PATTERN = /^[a-f0-9]{4,40}$/;

/**
 * Validate that a path exists, is a directory, and is a git repository.
 */
function isGitRepo(projectPath: string): { valid: boolean; error?: string } {
  try {
    // Check path exists
    if (!existsSync(projectPath)) {
      return { valid: false, error: 'Path does not exist' };
    }

    // Check it's a directory
    const stats = statSync(projectPath);
    if (!stats.isDirectory()) {
      return { valid: false, error: 'Path is not a directory' };
    }

    const gitMetadataPath = join(projectPath, '.git');
    if (!existsSync(gitMetadataPath)) {
      return { valid: false, error: 'Not a git repository' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function runGitCommand(
  projectPath: string,
  args: string[],
  maxBuffer: number = DEFAULT_MAX_BUFFER
): Promise<string> {
  const { stdout } = await execFileAsync('git', args, {
    cwd: projectPath,
    encoding: 'utf-8',
    maxBuffer,
    windowsHide: true,
  });
  return stdout;
}

function validateCommitHash(hash: string): string {
  const normalized = hash.trim();
  if (!COMMIT_HASH_PATTERN.test(normalized)) {
    throw new Error('Invalid commit hash format');
  }
  return normalized;
}

/**
 * Get a summary of a commit: metadata + list of changed files with stats.
 * Used for the hover popover.
 */
export async function getCommitSummary(
  projectPath: string,
  commitHash: string
): Promise<{ success: boolean; data?: CommitSummary; error?: string }> {
  try {
    const safeHash = validateCommitHash(commitHash);

    const validation = isGitRepo(projectPath);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const output = await runGitCommand(projectPath, [
      'show',
      '--stat',
      '--format=%H%n%s%n%an%n%aI',
      safeHash,
    ]);

    const lines = output.split('\n');
    if (lines.length < 4) {
      return { success: false, error: 'Unexpected git output format' };
    }

    const hash = lines[0].trim();
    const message = lines[1].trim();
    const author = lines[2].trim();
    const date = lines[3].trim();

    // Parse --stat output (lines after the blank line following metadata)
    const files: CommitFileStat[] = [];
    let totalAdditions = 0;
    let totalDeletions = 0;

    // Find the blank line that separates metadata from stat output
    let statStart = 4;
    while (statStart < lines.length && lines[statStart].trim() === '') {
      statStart++;
    }

    for (let i = statStart; i < lines.length; i++) {
      const line = lines[i];
      // Match stat lines like: " src/file.ts | 10 ++++------"
      const statMatch = line.match(
        /^\s+(.+?)\s+\|\s+(\d+)\s+(\+*)(-*)\s*$/
      );
      if (statMatch) {
        const path = statMatch[1].trim();
        const additions = statMatch[3].length;
        const deletions = statMatch[4].length;
        files.push({ path, additions, deletions });
        totalAdditions += additions;
        totalDeletions += deletions;
        continue;
      }

      // Match binary file changes: " file.png | Bin 0 -> 1234 bytes"
      const binaryMatch = line.match(/^\s+(.+?)\s+\|\s+Bin/);
      if (binaryMatch) {
        files.push({ path: binaryMatch[1].trim(), additions: 0, deletions: 0 });
      }
    }

    return {
      success: true,
      data: { hash, message, author, date, files, totalAdditions, totalDeletions },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get the full unified diff for a commit.
 * Used for the modal view. Returns raw diff text parsed on the renderer side.
 */
export async function getCommitDiff(
  projectPath: string,
  commitHash: string
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const safeHash = validateCommitHash(commitHash);

    const validation = isGitRepo(projectPath);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const output = await runGitCommand(projectPath, [
      'show',
      '--format=',
      safeHash,
    ]);

    return { success: true, data: output };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
