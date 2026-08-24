import { describe, expect, it } from 'vitest';
import { joinTitleEcho, splitTitleEcho, stripTitleEcho } from './titleEcho';

describe('stripTitleEcho', () => {
  it('drops a leading H1 that duplicates the title', () => {
    expect(stripTitleEcho('# Ship the thing\n\nBody text.', 'Ship the thing')).toBe('Body text.');
  });

  it('ignores case and whitespace differences when matching', () => {
    expect(stripTitleEcho('#  ship  THE thing \n\nBody.', 'Ship the Thing')).toBe('Body.');
  });

  it('allows blank lines before the echo', () => {
    expect(stripTitleEcho('\n\n# Title\n\nBody.', 'Title')).toBe('Body.');
  });

  it('keeps a leading H1 that says something different', () => {
    const body = '# Context\n\nBody.';
    expect(stripTitleEcho(body, 'Ship the thing')).toBe(body);
  });

  it('keeps an H1 that is not the first content line', () => {
    const body = 'Intro line.\n\n# Ship the thing\n\nBody.';
    expect(stripTitleEcho(body, 'Ship the thing')).toBe(body);
  });

  it('only matches level-1 headings', () => {
    const body = '## Ship the thing\n\nBody.';
    expect(stripTitleEcho(body, 'Ship the thing')).toBe(body);
  });

  it('returns an empty body when the echo is the whole body', () => {
    expect(stripTitleEcho('# Ship the thing', 'Ship the thing')).toBe('');
  });

  it('passes through when the title is empty', () => {
    expect(stripTitleEcho('# Anything\n\nBody.', '  ')).toBe('# Anything\n\nBody.');
  });
});

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
