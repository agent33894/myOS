import type { GitChange } from '@shared/ipc/contracts';
import { useGitFile } from '../../data/git';

/** A file's Git change (for the file tree's dots and the note's status), or null when it has none. */
export function useFileGitStatus(path: string | null | undefined): GitChange | null {
  return useGitFile(path)?.change ?? null;
}
