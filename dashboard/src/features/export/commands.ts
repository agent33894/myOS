import { ClipboardCopy, FileDown } from 'lucide-react';
import type { CommandSource } from '../../app/commands';
import { exported, failed } from '../history/toasts';
import { copyPageAsMarkdown, copyPageAsRichText, exportPage } from './exportPage';

// The editor saves a second after typing stops; exports read the file as saved.
const settled = () => new Promise<void>((done) => setTimeout(done, 0));

/** Export and copy the open note. */
export const exportCommands: CommandSource = ({ activePath: path }) =>
  path
    ? [
        {
          id: 'export.pdf',
          group: 'Note',
          label: 'Export as PDF…',
          icon: FileDown,
          keywords: 'print save',
          run: () => void exportPage(path, 'pdf', settled).then((saved) => saved && exported(saved), (error: unknown) => failed(error, 'Could not export')),
        },
        {
          id: 'export.html',
          group: 'Note',
          label: 'Export as HTML…',
          icon: FileDown,
          keywords: 'web save',
          run: () => void exportPage(path, 'html', settled).then((saved) => saved && exported(saved), (error: unknown) => failed(error, 'Could not export')),
        },
        {
          id: 'export.copy-markdown',
          group: 'Note',
          label: 'Copy as Markdown',
          icon: ClipboardCopy,
          run: () => void copyPageAsMarkdown(path, settled).catch((error: unknown) => failed(error, 'Could not copy')),
        },
        {
          id: 'export.copy-rich',
          group: 'Note',
          label: 'Copy as rich text',
          icon: ClipboardCopy,
          keywords: 'formatted html email',
          run: () => void copyPageAsRichText(path, settled).catch((error: unknown) => failed(error, 'Could not copy')),
        },
      ]
    : [];
