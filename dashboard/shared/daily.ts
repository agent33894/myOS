/** Where daily notes live: a folder and a file name pattern (Moment-style, as Obsidian uses). */
export interface DailyConfig {
  folder: string;
  pattern: string;
}

export const DAILY_DEFAULTS: DailyConfig = { folder: 'daily', pattern: 'YYYY-MM-DD' };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const pad = (value: number) => String(value).padStart(2, '0');
const ordinal = (day: number) => `${day}${day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th'}`;

const TOKENS: Record<string, (date: Date) => string> = {
  YYYY: (date) => String(date.getFullYear()),
  YY: (date) => String(date.getFullYear()).slice(-2),
  MMMM: (date) => MONTHS[date.getMonth()],
  MMM: (date) => MONTHS[date.getMonth()].slice(0, 3),
  MM: (date) => pad(date.getMonth() + 1),
  M: (date) => String(date.getMonth() + 1),
  Do: (date) => ordinal(date.getDate()),
  DD: (date) => pad(date.getDate()),
  D: (date) => String(date.getDate()),
  dddd: (date) => DAYS[date.getDay()],
  ddd: (date) => DAYS[date.getDay()].slice(0, 3),
};

const PATTERN = new RegExp(`\\[([^\\]]*)\\]|${Object.keys(TOKENS).join('|')}`, 'g');

/** Format `date` with the Moment tokens daily notes use (YYYY, MM, DD, dddd, …); `[text]` stays literal. */
export function formatDatePattern(date: Date, pattern: string): string {
  return pattern.replace(PATTERN, (token: string, literal?: string) => literal ?? TOKENS[token](date));
}

/** The folder-relative path of the daily note for `date`. */
export function dailyPath(date: Date, { folder, pattern }: DailyConfig): string {
  const name = formatDatePattern(date, pattern || DAILY_DEFAULTS.pattern);
  const dir = folder.replace(/^[./]+|\/+$/g, '');
  return `${dir ? `${dir}/` : ''}${name}.md`;
}
