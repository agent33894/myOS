import { TASK_LINE } from '@shared/tasks/parse';

// Where a task's description ends: the first priority, repeat, or date token, or a block id.
const TOKENS_START = /\s(?:🔺|⏫|🔼|🔽|⏬|🔁|📅|⏳|🛫|✅|➕|❌|due:\d{4}-\d{2}-\d{2}(?=\s|$)|\^[\w-]+\s*$)/u;

/** A tag as typed (`release`, `#work/api`) → `work/api`, or null when it can't be a tag. */
export function cleanTag(input: string): string | null {
  const tag = input.trim().replace(/^#+/, '');
  return tag && !/[\s#]/.test(tag) && /\D/.test(tag) ? tag : null;
}

/**
 * The text after the checkbox of `raw` with `#tag` added at the end of the
 * description, before any dates, repeat, priority, or block id. Everything
 * else stays byte for byte. Null when the line isn't a task or already has the tag.
 */
export function bodyWithTag(raw: string, input: string): string | null {
  const match = TASK_LINE.exec(raw);
  const tag = cleanTag(input);
  if (!match || !tag) return null;
  const body = match[4];
  const escaped = tag.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  if (new RegExp(`(^|\\s)#${escaped}(?=\\s|$)`, 'iu').test(body)) return null;
  const at = body.search(TOKENS_START);
  return at < 0 ? `${body.trimEnd()} #${tag}` : `${body.slice(0, at).trimEnd()} #${tag}${body.slice(at)}`;
}
