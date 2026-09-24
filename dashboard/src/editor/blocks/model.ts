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

const LINE_WIDTH = 80;

function inline(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(inline).join(', ')}]`;
  if (isRecord(value)) {
    const entries = Object.entries(value).map(([key, entry]) => `${JSON.stringify(key)}: ${inline(entry)}`);
    return entries.length ? `{ ${entries.join(', ')} }` : '{}';
  }
  return JSON.stringify(value);
}

/** Two-space JSON that keeps short objects and lists (a data row, a lane) on one line. */
function pretty(value: unknown, indent: string): string {
  const flat = inline(value);
  if (indent.length + flat.length <= LINE_WIDTH || (!Array.isArray(value) && !isRecord(value))) return flat;
  const inner = `${indent}  `;
  const lines = Array.isArray(value)
    ? value.map((entry) => inner + pretty(entry, inner))
    : Object.entries(value).map(([key, entry]) => `${inner}${JSON.stringify(key)}: ${pretty(entry, inner)}`);
  const [open, close] = Array.isArray(value) ? ['[', ']'] : ['{', '}'];
  return `${open}\n${lines.join(',\n')}\n${indent}${close}`;
}

/**
 * Readable JSON for a block's source, without object keys whose value is
 * undefined, an empty string, or an empty list. The top level is always
 * expanded so each setting sits on its own line.
 */
export function toJson(value: object): string {
  const clean: Record<string, unknown> = JSON.parse(
    JSON.stringify(value, function omitEmpty(this: unknown, _key, entry: unknown) {
      if (Array.isArray(this)) return entry;
      return entry === '' || (Array.isArray(entry) && entry.length === 0) ? undefined : entry;
    }),
  );
  const lines = Object.entries(clean).map(([key, entry]) => `  ${JSON.stringify(key)}: ${pretty(entry, '  ')}`);
  return `{\n${lines.join(',\n')}\n}`;
}

/** Markdown for a fenced block, identical to what the code block serializer writes. */
export const fence = (language: string, source: string) => `\`\`\`${language}\n${source}\n\`\`\``;
