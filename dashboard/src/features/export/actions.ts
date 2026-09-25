import { ClipboardCopy, FileCode2, FileDown, FileText, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { exported, failed } from '../history/toasts';
import { copyPageAsMarkdown, copyPageAsRichText, exportPage } from './exportPage';

/** Save pending edits first; the editor's own `saveNow` when there is one. */
export type Flush = () => Promise<void>;

const settled: Flush = () => Promise.resolve();

export interface ExportAction {
  id: string;
  label: string;
  icon: LucideIcon;
  keywords: string;
  run: (path: string, flush?: Flush) => void;
}

/** PDF, HTML, and copy as Markdown or rich text: one list for the command bar and the note's ⋯ menu. */
export const EXPORT_ACTIONS: readonly ExportAction[] = [
  {
    id: 'export.pdf',
    label: 'Export as PDF…',
    icon: FileDown,
    keywords: 'print save pdf',
    run: (path, flush = settled) => void exportPage(path, 'pdf', flush).then((saved) => saved && exported(saved), (error: unknown) => failed(error, 'Could not export')),
  },
  {
    id: 'export.html',
    label: 'Export as HTML…',
    icon: FileCode2,
    keywords: 'web save html',
    run: (path, flush = settled) => void exportPage(path, 'html', flush).then((saved) => saved && exported(saved), (error: unknown) => failed(error, 'Could not export')),
  },
  {
    id: 'export.copy-markdown',
    label: 'Copy as Markdown',
    icon: FileText,
    keywords: 'export clipboard md source',
    run: (path, flush = settled) =>
      void copyPageAsMarkdown(path, flush).then(() => toast.success('Copied as Markdown'), (error: unknown) => failed(error, 'Could not copy')),
  },
  {
    id: 'export.copy-rich',
    label: 'Copy as rich text',
    icon: ClipboardCopy,
    keywords: 'export clipboard formatted html email',
    run: (path, flush = settled) =>
      void copyPageAsRichText(path, flush).then(() => toast.success('Copied as rich text'), (error: unknown) => failed(error, 'Could not copy')),
  },
];
