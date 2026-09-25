import { writeFileSync } from 'fs';
import { join } from 'path';
import { formatLocalDate } from '../../shared/date';

/** One note that shows the basics: tasks with dates, capture, and a live view. */
function welcome(today: string, mod: string): string {
  return [
    '# Welcome',
    '',
    'This folder is plain Markdown. Every file in it is yours: open it in any editor, keep it in Git, or sync it however you like.',
    '',
    '## Try it',
    '',
    '- [ ] Check this task off',
    `- [ ] Press ${mod}N and capture a thought 📅 ${today}`,
    `- [ ] Press ${mod}P to open a file by name`,
    '- [ ] Water the plants 🔁 every week',
    '',
    '## Views',
    '',
    'A view is a search written as one line. This one lists every open task in the folder:',
    '',
    '```tasks',
    'open sort:due',
    '```',
    '',
  ].join('\n');
}

/** Write the starter note into `root`; never replaces a file that is already there. */
export function writeStarterContent(root: string, now = new Date()): void {
  const mod = process.platform === 'darwin' ? '⌘' : 'Ctrl+';
  try {
    writeFileSync(join(root, 'Welcome.md'), welcome(formatLocalDate(now), mod), { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }
}
