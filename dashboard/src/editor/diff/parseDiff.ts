export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffFile {
  oldPath: string;
  newPath: string;
  language: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  css: 'css',
  scss: 'css',
  html: 'html',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  toml: 'toml',
  xml: 'html',
  svg: 'html',
};

function inferLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_LANGUAGE_MAP[ext] || 'text';
}

/**
 * Parse unified diff text (from `git show --format=''`) into structured data.
 */
export function parseDiff(rawDiff: string): DiffFile[] {
  const files: DiffFile[] = [];
  const lines = rawDiff.split('\n');
  let i = 0;

  while (i < lines.length) {
    // Look for "diff --git a/path b/path"
    const diffHeader = lines[i].match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (!diffHeader) {
      i++;
      continue;
    }

    const oldPath = diffHeader[1];
    const newPath = diffHeader[2];
    const language = inferLanguage(newPath);
    const hunks: DiffHunk[] = [];
    let fileAdditions = 0;
    let fileDeletions = 0;
    i++;

    // Skip file metadata lines (index, ---, +++) until we hit a hunk or next file
    while (i < lines.length && !lines[i].startsWith('@@') && !lines[i].startsWith('diff --git')) {
      i++;
    }

    // Parse hunks
    while (i < lines.length && !lines[i].startsWith('diff --git')) {
      const hunkHeader = lines[i].match(/^@@\s+(-\d+(?:,\d+)?)\s+(\+\d+(?:,\d+)?)\s+@@(.*)$/);
      if (!hunkHeader) {
        i++;
        continue;
      }

      const header = lines[i];
      const oldStart = parseInt(hunkHeader[1].replace('-', '').split(',')[0], 10);
      const newStart = parseInt(hunkHeader[2].replace('+', '').split(',')[0], 10);
      const hunkLines: DiffLine[] = [];
      let oldLine = oldStart;
      let newLine = newStart;
      i++;

      while (i < lines.length && !lines[i].startsWith('@@') && !lines[i].startsWith('diff --git')) {
        const line = lines[i];

        if (line.startsWith('+')) {
          hunkLines.push({
            type: 'add',
            content: line.slice(1),
            newLineNumber: newLine,
          });
          newLine++;
          fileAdditions++;
        } else if (line.startsWith('-')) {
          hunkLines.push({
            type: 'remove',
            content: line.slice(1),
            oldLineNumber: oldLine,
          });
          oldLine++;
          fileDeletions++;
        } else if (line.startsWith(' ')) {
          hunkLines.push({
            type: 'context',
            content: line.slice(1),
            oldLineNumber: oldLine,
            newLineNumber: newLine,
          });
          oldLine++;
          newLine++;
        } else if (line === '\\ No newline at end of file') {
          // Skip this marker
        } else if (line === '') {
          // Could be an empty context line at end of hunk
          // Only treat as context if we're still inside the hunk
          // Check if next line is still part of this hunk
          const nextLine = lines[i + 1];
          if (
            nextLine !== undefined &&
            !nextLine.startsWith('@@') &&
            !nextLine.startsWith('diff --git') &&
            (nextLine.startsWith('+') || nextLine.startsWith('-') || nextLine.startsWith(' '))
          ) {
            hunkLines.push({
              type: 'context',
              content: '',
              oldLineNumber: oldLine,
              newLineNumber: newLine,
            });
            oldLine++;
            newLine++;
          } else {
            i++;
            break;
          }
        } else {
          // Unknown line format, skip
        }

        i++;
      }

      hunks.push({ header, lines: hunkLines });
    }

    files.push({
      oldPath,
      newPath,
      language,
      hunks,
      additions: fileAdditions,
      deletions: fileDeletions,
    });
  }

  return files;
}
