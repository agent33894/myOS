import { describe, expect, it } from 'vitest';
import type { ArtifactSummary } from '@shared/types';
import { searchNotes, snippet } from './noteSearch';

const note = (title: string, searchText: string, updated: string) =>
  ({ title, searchText, updated, created: updated.slice(0, 10) }) as ArtifactSummary;

describe('searchNotes', () => {
  const notes = [
    note('Tile ideas', 'Terracotta or zellige', '2026-09-20T10:00:00Z'),
    note('Weekly sync', 'We chose zellige for the backsplash', '2026-09-23T10:00:00Z'),
    note('Zellige suppliers', 'Three quotes', '2026-09-01T10:00:00Z'),
  ];

  it('ranks title matches before body matches', () => {
    expect(searchNotes(notes, 'zellige', 'edited').map((n) => n.title)).toEqual([
      'Zellige suppliers',
      'Weekly sync',
      'Tile ideas',
    ]);
  });

  it('sorts without a query', () => {
    expect(searchNotes(notes, '', 'title').map((n) => n.title)).toEqual(['Tile ideas', 'Weekly sync', 'Zellige suppliers']);
  });
});

describe('snippet', () => {
  it('skips headings markup and blank lines', () => {
    expect(snippet('\n## Goals\n\n- **Ship** the [plan](x.md)')).toBe('Goals');
  });

  it('shows the words around a match', () => {
    const body = `First line\n${'a '.repeat(40)}the zellige tiles arrived`;
    expect(snippet(body, 'zellige').startsWith('…')).toBe(true);
    expect(snippet(body, 'zellige')).toContain('zellige tiles arrived');
  });
});
