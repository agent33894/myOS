import type { GitChange } from '@shared/ipc/contracts';
import { useGitFile } from '../../data/git';
import { cn } from '../../ui';
import { CHANGE_STYLE } from './changeStyle';

/**
 * A file's Git change (for the file tree's dots and the note's status), or
 * null when it has none. The status refreshes shortly after any file changes
 * and when the window regains focus.
 */
export function useFileGitStatus(path: string | null | undefined): GitChange | null {
  return useGitFile(path)?.change ?? null;
}

/**
 * A small dot in the change's color (modified, new, deleted, conflict),
 * or nothing for an unchanged file. For the file tree (B1).
 */
export function GitDot({ path, className }: { path: string; className?: string }) {
  const change = useFileGitStatus(path);
  if (!change) return null;
  const style = CHANGE_STYLE[change];
  return <span role="img" aria-label={`Git: ${style.label}`} title={style.label} className={cn('size-1.5 shrink-0 rounded-full', style.dot, className)} />;
}
