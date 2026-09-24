import { useMemo, useRef, useState } from 'react';
import type { ArtifactSummary } from '@shared/types';
import { useArtifacts } from '../../data/selectors';
import { deriveArtifactFacets } from '../../utils/artifactFacets';
import { useArtifactEdit } from './projectMutations';

const MAX_SUGGESTIONS = 8;

/**
 * Tag chips with in-place add/remove. Suggestions come from the vault's own
 * tag frequency, filtered by the draft — pick from the list or press Enter
 * to coin a new tag (lowercased, hyphenated, deduped).
 */
export function ProjectInspectorTags({ artifact }: { artifact: ArtifactSummary }) {
  const { applyEdit } = useArtifactEdit();
  const artifacts = useArtifacts();
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const tags = artifact.tags ?? [];

  const suggestions = useMemo(() => {
    const query = draft.trim().toLowerCase();
    const { tagFrequency } = deriveArtifactFacets(artifacts);
    return Object.entries(tagFrequency)
      .filter(([tag]) => !tags.includes(tag) && (!query || tag.includes(query)))
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_SUGGESTIONS)
      .map(([tag]) => tag);
  }, [artifacts, draft, tags]);

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-');
    if (!tag || tags.includes(tag)) {
      setDraft('');
      return;
    }
    void applyEdit(artifact, { tags: [...tags, tag] }, `Tag ${tag}`);
    setDraft('');
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    void applyEdit(artifact, { tags: tags.filter((t) => t !== tag) }, `Untag ${tag}`);
  };

  const showSuggestions = focused && suggestions.length > 0;

  return (
    <div className="chronicle-inspector-tags">
      {tags.map((tag) => (
        <button
          key={tag}
          className="chronicle-inspector-tag"
          onClick={() => removeTag(tag)}
          aria-label={`Remove tag ${tag}`}
          title="Remove tag"
        >
          {tag}
          <span aria-hidden="true">×</span>
        </button>
      ))}
      <span className="chronicle-tag-suggest">
        <input
          ref={inputRef}
          className="chronicle-inspector-tag-input"
          value={draft}
          placeholder="+ tag"
          aria-label="Add tag"
          spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => setFocused(true)}
          // Delay lets a suggestion click land before the menu unmounts.
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addTag(event.currentTarget.value);
            }
            if (event.key === 'Escape') {
              setDraft('');
              event.currentTarget.blur();
              event.stopPropagation();
            }
          }}
        />
        {showSuggestions ? (
          <div className="chronicle-tag-suggest-menu" role="listbox" aria-label="Tag suggestions">
            {suggestions.map((tag) => (
              <button key={tag} role="option" aria-selected="false" onClick={() => addTag(tag)}>
                {tag}
              </button>
            ))}
          </div>
        ) : null}
      </span>
    </div>
  );
}
