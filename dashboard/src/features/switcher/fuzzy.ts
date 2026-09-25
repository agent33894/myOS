const BOUNDARY = /[\s/_\-.]/;

/**
 * How well `needle` matches `hay` as a loose, in-order run of letters
 * ("apirl" finds "api/rate-limits"): higher is better, -1 is no match.
 * Letters that follow each other, letters that start a word or path part,
 * and a plain substring score more; long texts score a little less.
 */
export function fuzzyScore(needle: string, hay: string): number {
  const query = needle.toLowerCase();
  const text = hay.toLowerCase();
  if (!query) return 0;
  let score = 0;
  let from = 0;
  let previous = -2;
  for (const char of query) {
    const at = text.indexOf(char, from);
    if (at < 0) return -1;
    score += 1 + (at === previous + 1 ? 3 : 0) + (at === 0 || BOUNDARY.test(text[at - 1]) ? 2 : 0);
    previous = at;
    from = at + 1;
  }
  const substring = text.indexOf(query);
  if (substring >= 0) score += query.length * 2 + (substring === 0 || BOUNDARY.test(text[substring - 1]) ? 4 : 0);
  return score - text.length * 0.02;
}

/** Each word of `query` must match `fields` somewhere; the score is the sum of each word's best match. */
export function matchAll(query: string, fields: Array<{ text: string; weight: number }>): number {
  const words = query.trim().split(/\s+/).filter(Boolean);
  let total = 0;
  for (const word of words) {
    const best = Math.max(...fields.map(({ text, weight }) => {
      const score = fuzzyScore(word, text);
      return score < 0 ? -1 : score * weight;
    }));
    if (best < 0) return -1;
    total += best;
  }
  return total;
}
