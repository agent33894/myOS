import { describe, expect, it } from 'vitest';
import { ArtifactType, type ArtifactSummary } from '@shared/types';
import { buildSearchIndex, searchArtifacts } from './librarySearch';

let seq = 0;
function makeArtifact(overrides: Partial<ArtifactSummary>): ArtifactSummary {
  seq += 1;
  return {
    id: `artifact-${seq}`,
    title: `ArtifactSummary ${seq}`,
    type: ArtifactType.MEMO,
    tags: [],
    status: 'active',
    related: [],
    content: '',
    created: '2026-08-01',
    updated: '2026-08-01T00:00:00.000Z',
    filePath: `vault/work/memos/artifact-${seq}.md`,
    ...overrides,
  } as ArtifactSummary;
}

describe('searchArtifacts', () => {
  it('ranks title hits above tag hits above body hits', () => {
    const index = buildSearchIndex([
      makeArtifact({ id: 'body', title: 'Unrelated', searchText: 'zustand stores everywhere' }),
      makeArtifact({ id: 'title', title: 'Zustand selector pattern' }),
      makeArtifact({ id: 'tag', title: 'State handling', tags: ['zustand'] }),
    ]);
    const hits = searchArtifacts(index, 'zustand', 'full');
    expect(hits.map((hit) => hit.artifact.id)).toEqual(['title', 'tag', 'body']);
  });

  it('boosts exact and prefix whole-query title matches', () => {
    const index = buildSearchIndex([
      makeArtifact({ id: 'contains', title: 'Notes on store split' }),
      makeArtifact({ id: 'prefix', title: 'Store split retrospective' }),
      makeArtifact({ id: 'exact', title: 'Store split' }),
    ]);
    const hits = searchArtifacts(index, 'store split', 'full');
    expect(hits.map((hit) => hit.artifact.id)).toEqual(['exact', 'prefix', 'contains']);
  });

  it('requires every token to match within the scope (AND semantics)', () => {
    const index = buildSearchIndex([
      makeArtifact({ id: 'both', title: 'Editor refactor plan' }),
      makeArtifact({ id: 'one', title: 'Editor polish' }),
    ]);
    expect(searchArtifacts(index, 'editor refactor', 'titles').map((h) => h.artifact.id)).toEqual(['both']);
  });

  it('scopes to titles and tags without touching the body', () => {
    const index = buildSearchIndex([
      makeArtifact({ id: 'body-only', title: 'Weekly note', searchText: 'tiptap controller' }),
      makeArtifact({ id: 'tagged', title: 'Weekly note', tags: ['tiptap'] }),
    ]);
    expect(searchArtifacts(index, 'tiptap', 'titles')).toHaveLength(0);
    expect(searchArtifacts(index, 'tiptap', 'tags').map((h) => h.artifact.id)).toEqual(['tagged']);
  });

  it('returns a trimmed context snippet only for body-only matches', () => {
    const body = `${'lead '.repeat(30)}the zustand adapter boundary ${'tail '.repeat(30)}`;
    const index = buildSearchIndex([
      makeArtifact({ id: 'body', title: 'Store notes', searchText: body }),
      makeArtifact({ id: 'title', title: 'Zustand notes', searchText: body }),
    ]);
    const hits = searchArtifacts(index, 'zustand', 'full');
    const bodyHit = hits.find((hit) => hit.artifact.id === 'body');
    const titleHit = hits.find((hit) => hit.artifact.id === 'title');
    expect(bodyHit?.context).toMatch(/^….*zustand adapter.*…$/);
    expect(bodyHit?.context?.length).toBeLessThan(120);
    expect(titleHit?.context).toBeUndefined();
  });

  it('breaks score ties by most recently updated', () => {
    const index = buildSearchIndex([
      makeArtifact({ id: 'older', title: 'Launch research', updated: '2026-08-01T00:00:00.000Z' }),
      makeArtifact({ id: 'newer', title: 'Launch approach', updated: '2026-08-10T00:00:00.000Z' }),
    ]);
    expect(searchArtifacts(index, 'launch', 'full').map((h) => h.artifact.id)).toEqual(['newer', 'older']);
  });

  it('returns nothing for an empty or whitespace query', () => {
    const index = buildSearchIndex([makeArtifact({ title: 'Anything' })]);
    expect(searchArtifacts(index, '   ', 'full')).toHaveLength(0);
  });
});
