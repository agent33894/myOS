import { useCallback, useDeferredValue, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArtifactType, type Artifact } from '../../types/artifacts';
import {
  buildProjectInkMap,
  buildSections,
  mastheadCounts,
  typeMatchCounts,
  type IndexSection,
  type LibrarySort,
  type SectionId,
} from './libraryIndex';
import { buildSearchIndex, searchArtifacts, type SearchScope } from './librarySearch';

const TYPE_VALUES = new Set<string>(Object.values(ArtifactType));

/**
 * Binds The Index's state to URL params — q, scope, types, all, sort — and
 * derives sections, chip counts, and masthead counts. The query is deferred so
 * typing never blocks on a full-text pass.
 */
export function useLibrarySearch(artifacts: Artifact[]) {
  const [params, setParams] = useSearchParams();

  const query = params.get('q') ?? '';
  const scopeParam = params.get('scope');
  const scope: SearchScope = scopeParam === 'titles' || scopeParam === 'tags' ? scopeParam : 'full';
  const sort: LibrarySort = params.get('sort') === 'created' ? 'created' : 'updated';
  const activeTypes = useMemo(() => {
    const listed = (params.get('types') ?? '').split(',').filter((value) => TYPE_VALUES.has(value));
    return new Set(listed as ArtifactType[]);
  }, [params]);
  const expanded = (params.get('all') as SectionId | null) ?? null;

  const update = useCallback(
    (mutate: (next: URLSearchParams) => void, replace = false) => {
      const next = new URLSearchParams(params);
      mutate(next);
      setParams(next, { replace });
    },
    [params, setParams],
  );

  const deferredQuery = useDeferredValue(query);
  const index = useMemo(() => buildSearchIndex(artifacts), [artifacts]);
  const hits = useMemo(
    () => (deferredQuery.trim() ? searchArtifacts(index, deferredQuery, scope) : null),
    [index, deferredQuery, scope],
  );

  const sections: IndexSection[] = useMemo(
    () => buildSections(hits, artifacts, activeTypes, expanded, sort),
    [hits, artifacts, activeTypes, expanded, sort],
  );
  const chipCounts = useMemo(() => typeMatchCounts(hits, artifacts), [hits, artifacts]);
  const masthead = useMemo(() => mastheadCounts(artifacts), [artifacts]);
  const projectInks = useMemo(() => buildProjectInkMap(artifacts), [artifacts]);
  const flatRows = useMemo(() => sections.flatMap((section) => section.rows.map((row) => row.artifact)), [sections]);

  const setQuery = useCallback(
    (value: string) =>
      update((next) => {
        if (value) next.set('q', value);
        else next.delete('q');
      }, true),
    [update],
  );
  const setScope = useCallback(
    (value: SearchScope) =>
      update((next) => {
        if (value === 'full') next.delete('scope');
        else next.set('scope', value);
      }),
    [update],
  );
  const toggleType = useCallback(
    (type: ArtifactType) =>
      update((next) => {
        const selection = new Set(activeTypes);
        if (selection.has(type)) selection.delete(type);
        else selection.add(type);
        if (selection.size) next.set('types', [...selection].join(','));
        else next.delete('types');
      }),
    [update, activeTypes],
  );
  const toggleExpanded = useCallback(
    (id: SectionId) =>
      update((next) => {
        if (next.get('all') === id) next.delete('all');
        else next.set('all', id);
      }),
    [update],
  );
  const setSort = useCallback(
    (value: LibrarySort) =>
      update((next) => {
        if (value === 'updated') next.delete('sort');
        else next.set('sort', value);
      }),
    [update],
  );

  return {
    query,
    scope,
    sort,
    activeTypes,
    isSearching: hits !== null,
    sections,
    flatRows,
    chipCounts,
    masthead,
    projectInks,
    setQuery,
    setScope,
    setSort,
    toggleType,
    toggleExpanded,
  };
}
