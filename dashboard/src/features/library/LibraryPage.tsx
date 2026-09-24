import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useArtifactsStore } from '../../store/artifacts';
import { isTypingTarget, useListNavigation } from '../../hooks/useListNavigation';
import { ArtifactType, type Artifact } from '../../types/artifacts';
import { toProjectArtifactUrl } from '../artifact-route/routeContract';
import { ArtifactDetail } from '../shell/ArtifactDetail';
import { LibraryMasthead } from './LibraryMasthead';
import { LibrarySearchHero } from './LibrarySearchHero';
import { LibraryTypeSection } from './LibraryTypeSection';
import { useLibrarySearch } from './useLibrarySearch';

/**
 * The Index: /library as a search-first, full-width index. The vault lists
 * newest-created first, optionally grouped by type; ?artifact=<filePath> renders the Living Page full-width and
 * Escape (or the back affordance) returns to the index with state intact.
 * Projects never open as bare Markdown here: they route to their workbench.
 */
export default function LibraryPage() {
  const artifacts = useArtifactsStore((state) => state.artifacts);
  const isLoading = useArtifactsStore((state) => state.isLoading);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const openPath = params.get('artifact');
  const openArtifactItem = openPath
    ? (artifacts.find((artifact) => artifact.filePath === openPath) ?? null)
    : null;

  const search = useLibrarySearch(artifacts);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const openArtifact = useCallback(
    (artifact: Artifact) => {
      if (artifact.type === ArtifactType.PROJECT) {
        navigate(toProjectArtifactUrl(artifact.id));
        return;
      }
      const next = new URLSearchParams(params);
      next.set('artifact', artifact.filePath);
      setParams(next);
    },
    [params, setParams, navigate],
  );
  const closeArtifact = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete('artifact');
    setParams(next);
  }, [params, setParams]);
  useListNavigation({
    items: search.flatRows,
    selectedId: highlightedId,
    getId: (artifact) => artifact.id,
    onSelect: (artifact) => setHighlightedId(artifact.id),
    onActivate: openArtifact,
    onEscape: () => setHighlightedId(null),
    enabled: !openPath,
  });

  // `/` focuses search on the index; Escape leaves the full-width Living Page
  // — but never while the caret is in an input or the editor body.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (event.key === '/' && !openPath) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === 'Escape' && openPath) {
        event.preventDefault();
        closeArtifact();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openPath, closeArtifact]);

  if (openArtifactItem?.type === ArtifactType.PROJECT) {
    return <Navigate replace to={toProjectArtifactUrl(openArtifactItem.id)} />;
  }

  if (openPath) {
    return (
      <div className="chronicle-library-full">
        <div className="chronicle-library-back">
          <button type="button" onClick={closeArtifact}>
            <ArrowLeft size={11} aria-hidden="true" />
            Index · esc
          </button>
        </div>
        {openArtifactItem ? (
          <ArtifactDetail artifact={openArtifactItem} onDeleted={closeArtifact} />
        ) : (
          <div className="chronicle-detail-empty">
            <p>{isLoading ? 'Opening…' : 'Artifact not found.'}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="chronicle-library-index custom-scrollbar">
      <LibraryMasthead counts={search.masthead} />
      <LibrarySearchHero
        query={search.query}
        scope={search.scope}
        sort={search.sort}
        grouping={search.grouping}
        chipCounts={search.chipCounts}
        activeTypes={search.activeTypes}
        inputRef={searchInputRef}
        onQueryChange={search.setQuery}
        onScopeChange={search.setScope}
        onSortChange={search.setSort}
        onGroupingChange={search.setGrouping}
        onToggleType={search.toggleType}
      />
      {search.sections.length === 0 ? (
        <p className="chronicle-empty-row">
          {search.isSearching ? 'No matches — try Full text scope or fewer words.' : 'The library is empty.'}
        </p>
      ) : (
        search.sections.map((section) => (
          <LibraryTypeSection
            key={section.id}
            section={section}
            highlightedId={highlightedId}
            projectInks={search.projectInks}
            sort={search.sort}
            showType={search.grouping === 'none'}
            onOpen={openArtifact}
            onToggleExpand={search.toggleExpanded}
          />
        ))
      )}
    </div>
  );
}
