import { captureLine } from '../../shared/capture';
import { dailyPath } from '../../shared/daily';
import { parseLocalDate } from '../../shared/date';
import type { Note } from '../../shared/spec';
import { DomainError } from '../errors';
import { getSettings } from '../settings/settings';
import { appendToFile } from './tasks';

/** Today's daily note path, or the one for `date` (YYYY-MM-DD). The file may not exist yet. */
export function dailyNotePath(date?: string): string {
  if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new DomainError('INVALID', 'Dates are written YYYY-MM-DD.');
  const { dailyFolder, dailyPattern } = getSettings();
  return dailyPath(date ? parseLocalDate(date) : new Date(), { folder: dailyFolder, pattern: dailyPattern });
}

/** Add a capture to the daily note (made on first capture) or `target`, under the capture heading when set. */
export function capture(text: string, target?: string): Promise<Note> {
  if (!text.trim()) throw new DomainError('INVALID', 'Nothing to capture.');
  const { captureTarget, captureHeading } = getSettings();
  const where = target ?? captureTarget;
  return appendToFile(where === 'daily' ? dailyNotePath() : where, captureLine(text), captureHeading ?? undefined);
}
