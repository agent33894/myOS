import type { ComponentType } from 'react';
import { GitStatusBarItem } from '../features/git/GitStatusBarItem';
import { NoteStatusItem } from '../features/note/NoteStatusItem';

export interface StatusItem {
  id: string;
  side: 'left' | 'right';
  component: ComponentType;
}

/** The status bar, left to right: branch and changes (git), then words and save state (note). */
export const STATUS_ITEMS: readonly StatusItem[] = [
  { id: 'git', side: 'left', component: GitStatusBarItem },
  { id: 'note', side: 'right', component: NoteStatusItem },
];
