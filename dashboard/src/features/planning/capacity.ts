import { useSettingsStore } from '../../store/settings';
import { formatHours } from '../tasks/dates';

/**
 * The honest capacity line: "About 3 h planned · 6 h available". It is
 * information only; nothing is ever blocked. Null when switched off in
 * Settings or when nothing planned carries an estimate.
 */
export function useCapacityLine(minutes: number): string | null {
  const show = useSettingsStore((state) => state.showCapacity);
  const hours = useSettingsStore((state) => state.availableHours);
  if (!show || minutes <= 0) return null;
  return `About ${formatHours(minutes)} planned · ${formatHours(hours * 60)} available`;
}
