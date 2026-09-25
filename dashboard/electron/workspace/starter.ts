import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { formatLocalDate } from '../../shared/date';

/** The note that opens first: what the folder is and the few keys worth knowing. */
function readme(mod: string): string {
  return [
    '# Notes',
    '',
    'This folder is plain Markdown. Every file in it is yours: open it in any editor, keep it in Git, or sync it however you like. myOS Next adds nothing to it that you did not type.',
    '',
    '- `daily/` holds one note per day. Captures land there.',
    '- [[First steps]] has a few tasks and a view to try.',
    '',
    '## Keys',
    '',
    `- ${mod}P opens a file by name.`,
    `- ${mod}K lists every command.`,
    `- ${mod}N captures a line into today's note.`,
    '- ? shows every shortcut.',
    '',
  ].join('\n');
}

/** A note with a few tasks and a live view. */
function firstSteps(today: string, mod: string): string {
  return [
    '# First steps',
    '',
    '- [ ] Check this task off',
    `- [ ] Press ${mod}N and capture a thought 📅 ${today}`,
    `- [ ] Press ${mod}P to open a file by name`,
    '- [ ] Water the plants 🔁 every week',
    '',
    '## Open tasks',
    '',
    'A view is a search written as one line. This one lists every open task in the folder:',
    '',
    '```view',
    'open sort:due',
    '```',
    '',
  ].join('\n');
}

function writeNew(path: string, content: string): void {
  try {
    writeFileSync(path, content, { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }
}

/** Write the starter files into `root`; never replaces a file that is already there. */
export function writeStarterContent(root: string, now = new Date()): void {
  const mod = process.platform === 'darwin' ? '⌘' : 'Ctrl+';
  writeNew(join(root, 'README.md'), readme(mod));
  writeNew(join(root, 'First steps.md'), firstSteps(formatLocalDate(now), mod));
  mkdirSync(join(root, 'daily'), { recursive: true });
}
