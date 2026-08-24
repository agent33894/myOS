import { formatLocalDate } from '@shared/date';

/**
 * Get the current date as a string in 'yyyy-MM-dd' format.
 */
export function getCurrentDateString(): string {
  return formatLocalDate();
}
