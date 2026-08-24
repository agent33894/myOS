import { formatLocalDate } from '../../../shared/date.js';

/**
 * Format a date as an ISO timestamp string with timezone (UTC/Z).
 * Used for fields that require sub-day precision (e.g., `updated`).
 */
export function getIsoTimestampString(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Extract date string from a Date object that was parsed from YAML.
 *
 * gray-matter parses YAML dates like `created: 2026-01-10` (no quotes) as
 * JavaScript Date objects. JavaScript interprets these date-only strings as
 * UTC midnight (2026-01-10T00:00:00.000Z). For users in timezones behind UTC
 * (like Central Time = UTC-6), this causes the date to shift back one day
 * when extracting local date components.
 *
 * This function detects UTC midnight dates and uses UTC components to extract
 * the intended date, avoiding the timezone shift bug.
 */
function getDateStringFromDate(date: Date): string {
  const isUtcMidnight =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;

  if (isUtcMidnight) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return formatLocalDate(date);
}

/**
 * Normalize a date value to ISO string format (YYYY-MM-DD).
 * Handles Date objects, strings, and provides a fallback for invalid/missing values.
 */
export function normalizeDate(dateValue: unknown, fallbackDate: string): string {
  if (!dateValue) return fallbackDate;

  if (dateValue instanceof Date) {
    return getDateStringFromDate(dateValue);
  }

  if (typeof dateValue === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(dateValue)) {
      const parsedDateTime = new Date(dateValue);
      if (!isNaN(parsedDateTime.getTime())) {
        return parsedDateTime.toISOString();
      }
    }
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) {
      return getDateStringFromDate(parsed);
    }
  }

  return fallbackDate;
}
