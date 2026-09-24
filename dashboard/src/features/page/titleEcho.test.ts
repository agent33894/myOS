import { describe, expect, it } from 'vitest';
import { joinTitleEcho, splitTitleEcho } from './titleEcho';

describe('splitTitleEcho / joinTitleEcho', () => {
  it('round-trips a body with an echo', () => {
    const original = '# Ship the thing\n\nBody text.';
    const { body, hadEcho } = splitTitleEcho(original, 'Ship the thing');
    expect(body).toBe('Body text.');
    expect(hadEcho).toBe(true);
    expect(joinTitleEcho(body, hadEcho, 'Ship the thing')).toBe(original);
  });

  it('round-trips a body without an echo untouched', () => {
    const original = 'Intro line.\n\n# Context\n\nBody.';
    const { body, hadEcho } = splitTitleEcho(original, 'Ship the thing');
    expect(body).toBe(original);
    expect(hadEcho).toBe(false);
    expect(joinTitleEcho(body, hadEcho, 'Ship the thing')).toBe(original);
  });

  it('normalizes leading blank lines through the round trip', () => {
    const { body, hadEcho } = splitTitleEcho('\n\n# Title\n\nBody.', 'Title');
    expect(joinTitleEcho(body, hadEcho, 'Title')).toBe('# Title\n\nBody.');
  });

  it('rewrites the echo line when the title was renamed', () => {
    const { body, hadEcho } = splitTitleEcho('# Old name\n\nBody.', 'Old name');
    expect(joinTitleEcho(body, hadEcho, 'New name')).toBe('# New name\n\nBody.');
  });

  it('keeps a lone echo when the body is emptied', () => {
    const { body, hadEcho } = splitTitleEcho('# Title', 'Title');
    expect(body).toBe('');
    expect(joinTitleEcho(body, hadEcho, 'Title')).toBe('# Title\n');
  });

  it('does not invent an echo when none existed', () => {
    expect(joinTitleEcho('Body only.', false, 'Title')).toBe('Body only.');
  });
});
