/** "Aug 14" from a YYYY-MM-DD or ISO stamp; null when unparseable. */
export function shortDate(stamp?: string | null): string | null {
  if (!stamp) return null;
  const date = new Date(stamp.length === 10 ? `${stamp}T00:00:00` : stamp);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
