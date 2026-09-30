import { describe, expect, it } from 'vitest';
import { snippet } from './noteSearch';

describe('snippet', () => {
  it('previews the first line of text, not a section heading', () => {
    expect(snippet('## Context\n\nTeams keep notes in folders.\n\n## Decision\n\nOpen any folder.')).toBe(
      'Teams keep notes in folders.',
    );
  });

  it('falls back to a heading when a page has nothing else', () => {
    expect(snippet('## Agenda\n\n## Actions')).toBe('Agenda');
  });

  it('shows the words around a search match, headings included', () => {
    expect(snippet('## Rationale\n\nBecause.', 'rational')).toBe('Rationale');
  });
});
