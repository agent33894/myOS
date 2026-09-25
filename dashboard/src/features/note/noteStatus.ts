import { create } from 'zustand';

interface NoteStatus {
  path: string | null;
  words: number;
  saving: boolean;
  dirty: boolean;
  saved: boolean;
}

/** The note on screen's word count and save state, for the status bar. The note tab writes it. */
export const useNoteStatus = create<NoteStatus>(() => ({ path: null, words: 0, saving: false, dirty: false, saved: false }));

export const countWords = (text: string) => (text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []).length;
