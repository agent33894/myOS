import { create } from 'zustand';

export type Ritual = 'close-day' | 'weekly-review';

const PREFS_KEY = 'myos-rituals';

interface RitualPrefs {
  /** Show the Weekly review item in the sidebar on the chosen day. */
  weeklyNudge: boolean;
  /** Monday of the week the user dismissed the sidebar item for. */
  dismissedWeek: string | null;
}

function readPrefs(): RitualPrefs {
  const fallback: RitualPrefs = { weeklyNudge: true, dismissedWeek: null };
  try {
    const stored = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<RitualPrefs>;
    return {
      weeklyNudge: typeof stored.weeklyNudge === 'boolean' ? stored.weeklyNudge : fallback.weeklyNudge,
      dismissedWeek: typeof stored.dismissedWeek === 'string' ? stored.dismissedWeek : null,
    };
  } catch {
    return fallback;
  }
}

interface RitualState extends RitualPrefs {
  open: Ritual | null;
  /** Where an unfinished Weekly review picks up again (it can be left to sort the Inbox). */
  weeklyStep: number;
  start: (ritual: Ritual) => void;
  close: () => void;
  setWeeklyStep: (step: number) => void;
  setPrefs: (prefs: Partial<RitualPrefs>) => void;
}

/** Which ritual is open, plus the two small preferences the rituals keep for themselves. */
export const useRitualStore = create<RitualState>((set, get) => ({
  ...readPrefs(),
  open: null,
  weeklyStep: 0,
  start: (open) => set({ open }),
  close: () => set({ open: null }),
  setWeeklyStep: (weeklyStep) => set({ weeklyStep }),
  setPrefs: (prefs) => {
    set(prefs);
    const { weeklyNudge, dismissedWeek } = { ...get(), ...prefs };
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ weeklyNudge, dismissedWeek }));
    } catch {
      // Storage unavailable: the preference lasts until the app closes.
    }
  },
}));

export const startRitual = (ritual: Ritual) => useRitualStore.getState().start(ritual);
