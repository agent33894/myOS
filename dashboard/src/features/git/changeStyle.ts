import type { GitChange } from '@shared/ipc/contracts';

interface ChangeStyle {
  letter: string;
  label: string;
  /** Text color for the letter. */
  text: string;
  /** Fill for a dot. */
  dot: string;
}

/** How each kind of change looks: modified amber, new green, deleted and conflicted red, renamed accent. */
export const CHANGE_STYLE: Record<GitChange, ChangeStyle> = {
  modified: { letter: 'M', label: 'Modified', text: 'text-warning', dot: 'bg-warning' },
  added: { letter: 'A', label: 'Added', text: 'text-success', dot: 'bg-success' },
  untracked: { letter: 'U', label: 'New, not in Git yet', text: 'text-success', dot: 'bg-success' },
  deleted: { letter: 'D', label: 'Deleted', text: 'text-danger', dot: 'bg-danger' },
  renamed: { letter: 'R', label: 'Renamed', text: 'text-accent-text', dot: 'bg-accent' },
  conflicted: { letter: '!', label: 'Conflict', text: 'text-danger', dot: 'bg-danger ring-2 ring-danger-soft' },
};
