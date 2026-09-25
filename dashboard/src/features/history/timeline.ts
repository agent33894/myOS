import { formatDistanceToNowStrict } from 'date-fns';
import type { GitCommit, VersionInfo } from '@shared/ipc/contracts';
import { diffLines, splitFrontmatter, toFileDiff } from './lineDiff';
import type { FileDiff } from '../git/diff';

/** One point in a note's history: a Git commit that touched it, or a local copy kept before a save. */
export type HistoryEntry = { kind: 'commit'; id: string; date: string; commit: GitCommit } | { kind: 'copy'; id: string; date: string; version: VersionInfo };

/** Commits and local copies in one list, newest first. */
export function mergeTimeline(commits: GitCommit[], versions: VersionInfo[]): HistoryEntry[] {
  return [
    ...commits.map((commit): HistoryEntry => ({ kind: 'commit', id: `c:${commit.hash}`, date: commit.date, commit })),
    ...versions.map((version): HistoryEntry => ({ kind: 'copy', id: `v:${version.id}`, date: version.savedAt, version })),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export function relativeDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  if (Date.now() - date.getTime() < 60_000) return 'just now';
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

export const sizeLabel = (bytes: number) => (bytes < 1024 ? `${bytes} bytes` : `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`);

export interface Comparison {
  diff: FileDiff;
  /** The title this version had, when it differs from now. */
  oldTitle: string | null;
}

const normalize = (body: string) => body.replace(/^\n+/, '');

/** What changed from an earlier file (with its frontmatter) to the note's current body. */
export function compare(earlier: string, current: { title: string; content: string }): Comparison {
  const then = splitFrontmatter(earlier);
  const diff = toFileDiff(diffLines(normalize(then.body), normalize(current.content)));
  return { diff, oldTitle: then.title !== null && then.title !== current.title ? then.title : null };
}
