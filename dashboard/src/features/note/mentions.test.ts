import { describe, expect, it } from 'vitest';
import { findMentions, linkMention } from './mentions';

const wiki = (text: string) => `[[${text}]]`;

describe('unlinked mentions', () => {
  const body = [
    'Talked about the rate limiter with Sam.',
    'See [[Rate limiter]] and `rate limiter` in code.',
    '```',
    'rate limiter inside a fence',
    '```',
    'The Rate Limiter design is done. rate limiters is another word.',
  ].join('\n');

  it('finds plain-text mentions only, outside code and links', () => {
    expect(findMentions(body, 'Rate limiter').map((mention) => mention.text)).toEqual(['rate limiter', 'Rate Limiter']);
  });

  it('links exactly one occurrence and leaves every other byte alone', () => {
    const linked = linkMention(body, 'Rate limiter', 1, 'Rate Limiter', wiki);
    expect(linked).toBe(body.replace('The Rate Limiter design', 'The [[Rate Limiter]] design'));
    expect(linkMention(body, 'Rate limiter', 1, 'rate limiter', wiki)).toBeNull();
  });
});
