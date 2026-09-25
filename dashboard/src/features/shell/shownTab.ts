import { createContext, useContext } from 'react';
import type { Tab } from '../../store/ui';

export const ShownTab = createContext<Tab | null>(null);

/** The tab a screen is shown in (its mode, its group). Null outside a tab. */
export const useShownTab = () => useContext(ShownTab);
