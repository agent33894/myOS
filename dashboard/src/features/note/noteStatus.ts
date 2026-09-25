import { create } from 'zustand';

interface NoteStatus {
  path: string | null;
  /** The body as it is in the editor, unsaved edits included, for the Outline. */
  content: string;
  words: number;
  saving: boolean;
  dirty: boolean;
  saved: boolean;
}

/** The note on screen: its live text, word count, and save state, for the status bar and panels. The note tab writes it. */
export const useNoteStatus = create<NoteStatus>(() => ({ path: null, content: '', words: 0, saving: false, dirty: false, saved: false }));

export const countWords = (text: string) => (text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []).length;

const WORDS_PER_MINUTE = 230;

/** "4 min read", from a word count; under a minute reads as 1. */
export const readingTime = (words: number) => `${Math.max(1, Math.round(words / WORDS_PER_MINUTE))} min read`;
