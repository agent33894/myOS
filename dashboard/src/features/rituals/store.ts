import { create } from 'zustand';

export type Ritual = 'close-day' | 'weekly-review';

interface RitualState {
  open: Ritual | null;
  /** Where an unfinished Weekly review picks up again (it can be left to sort the Inbox). */
  weeklyStep: number;
  start: (ritual: Ritual) => void;
  close: () => void;
  setWeeklyStep: (step: number) => void;
}

/** Which ritual is open. Its preferences live in Settings (`weeklyNudge`, `weeklyNudgeDismissed`). */
export const useRitualStore = create<RitualState>((set) => ({
  open: null,
  weeklyStep: 0,
  start: (open) => set({ open }),
  close: () => set({ open: null }),
  setWeeklyStep: (weeklyStep) => set({ weeklyStep }),
}));

export const startRitual = (ritual: Ritual) => useRitualStore.getState().start(ritual);
