export interface CommitSummary {
  hash: string;
  message: string;
  author: string;
  date: string;
  files: CommitFileStat[];
  totalAdditions: number;
  totalDeletions: number;
}

export interface CommitFileStat {
  path: string;
  additions: number;
  deletions: number;
}

export interface DiffFile {
  oldPath: string;
  newPath: string;
  language: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}
