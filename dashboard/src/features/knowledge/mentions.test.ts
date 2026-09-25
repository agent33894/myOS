import { describe, expect, it } from 'vitest';
import { findMentions, linkMention } from './mentions';

const BODY = [
  'Planning the Garden plan this week.',
  '',
  '```',
  'Garden plan inside code stays code',
  '```',
  '',
  'Already linked: [[Garden plan]]. See `Garden plan` and [Garden plan](notes/garden.md).',
  'Gardenplanning is another word; the garden plan, and Garden plan again.',
].join('\r\n');

describe('unlinked mentions', () => {
  it('finds whole-word plain-text mentions only, outside code and links', () => {
    const found = findMentions(BODY, 'Garden plan').map(({ line, text }) => [line, text]);
    expect(found).toEqual([
      [0, 'Garden plan'],
      [7, 'garden plan'],
      [7, 'Garden plan'],
    ]);
  });

  it('links exactly one occurrence and keeps every other byte', () => {
    const [, second] = findMentions(BODY, 'Garden plan');
    const linked = linkMention(BODY, 'Garden plan', second)!;
    expect(linked).toBe(BODY.replace('; the garden plan,', '; the [[garden plan]],'));
    // The rest of the file, line endings included, is untouched.
    expect(linked.replace('[[garden plan]]', 'garden plan')).toBe(BODY);
  });

  it('refuses when the line no longer mentions the title', () => {
    expect(linkMention('Nothing here', 'Garden plan', { line: 0, column: 0 })).toBeNull();
  });
});
