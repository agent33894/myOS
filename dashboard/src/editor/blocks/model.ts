// Shared vocabulary for rich-block models: each block kind parses its fence
// body into a typed value and serializes it back. Models are pure so they can
// be tested without a DOM.

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export interface BlockModel<T> {
  parse(raw: string): Parsed<T>;
  serialize(value: T): string;
}

export class BlockError extends Error {}

/** Run a parser that throws `BlockError`s (or JSON syntax errors) and wrap the outcome. */
export function attempt<T>(parse: () => T): Parsed<T> {
  try {
    return { ok: true, value: parse() };
  } catch (error) {
    if (error instanceof SyntaxError) return { ok: false, error: 'This block’s source isn’t valid JSON.' };
    return { ok: false, error: error instanceof Error ? error.message : 'This block couldn’t be read.' };
  }
}

export function fail(message: string): never {
  throw new BlockError(message);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function jsonObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) fail('This block is empty.');
  const parsed: unknown = JSON.parse(trimmed);
  if (!isRecord(parsed)) fail('This block’s source must be a JSON object.');
  return parsed;
}

/** A trimmed non-empty string, or undefined. */
export function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Pretty JSON without object keys whose value is undefined, an empty string, or an empty list. */
export function toJson(value: object): string {
  return JSON.stringify(
    value,
    function omitEmpty(this: unknown, _key, entry: unknown) {
      if (Array.isArray(this)) return entry;
      return entry === '' || (Array.isArray(entry) && entry.length === 0) ? undefined : entry;
    },
    2,
  );
}

/** Markdown for a fenced block, identical to what the code block serializer writes. */
export const fence = (language: string, source: string) => `\`\`\`${language}\n${source}\n\`\`\``;
