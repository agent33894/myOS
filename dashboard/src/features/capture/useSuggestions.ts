import { useMemo, useState, type KeyboardEvent, type SyntheticEvent } from 'react';
import { suggest, type Suggestion } from '@shared/inbox';
import { useArtifacts } from '../../data/selectors';
import { useProjectRefs } from '../tasks/projectRefs';

export interface SuggestionOption {
  key: string;
  /** What replaces the token being typed, trigger included ("@kitchen-renovation"). */
  insert: string;
  label: string;
  /** A project's dot color. */
  color?: string;
}

const LIMIT = 6;
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Every tag in use, most used first. */
function useTagCounts() {
  const artifacts = useArtifacts();
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of artifacts) for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [artifacts]);
}

type Field = HTMLInputElement | HTMLTextAreaElement;

/**
 * `@project` and `#tag` completion for a capture field: ↑↓ choose, ⏎ or Tab
 * inserts, Esc closes. Spread `fieldProps` onto the field and render
 * `SuggestionList` with `list`.
 */
export function useSuggestions(text: string, setText: (text: string) => void) {
  const projects = useProjectRefs();
  const tags = useTagCounts();
  const [caret, setCaret] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const [field, setField] = useState<Field | null>(null);

  const token: Suggestion | null = caret === null ? null : suggest(text, Math.min(caret, text.length));

  const options = useMemo((): SuggestionOption[] => {
    if (!token) return [];
    const wanted = slug(token.query);
    if (token.trigger === '@') {
      return projects.open
        .filter((project) => !wanted || slug(project.title).includes(wanted))
        .sort((a, b) => Number(slug(b.title).startsWith(wanted)) - Number(slug(a.title).startsWith(wanted)))
        .slice(0, LIMIT)
        .map((project) => ({ key: project.id, insert: `@${slug(project.title)}`, label: project.title, color: project.color }));
    }
    const query = token.query.toLowerCase();
    return tags
      .filter(([tag]) => tag.toLowerCase().startsWith(query) && tag.toLowerCase() !== query)
      .slice(0, LIMIT)
      .map(([tag]) => ({ key: tag, insert: `#${tag}`, label: `#${tag}` }));
  }, [token?.trigger, token?.query, projects, tags]);

  const open = Boolean(token) && options.length > 0 && dismissed !== token?.start;
  const current = Math.min(active, Math.max(options.length - 1, 0));

  const choose = (option: SuggestionOption) => {
    if (!token) return;
    const after = text.slice(token.end).replace(/^\s*/, '');
    const next = `${text.slice(0, token.start)}${option.insert} ${after}`;
    const position = token.start + option.insert.length + 1;
    setText(next);
    setCaret(position);
    setActive(0);
    window.requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(position, position);
    });
  };

  const track = (event: SyntheticEvent<Field>) => {
    setField(event.currentTarget);
    setCaret(event.currentTarget.selectionStart);
  };

  /** Returns true when the key was used by the list. */
  const onKeyDown = (event: KeyboardEvent<Field>): boolean => {
    if (!open || event.nativeEvent.isComposing) return false;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current + step + options.length) % options.length);
      return true;
    }
    if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
      event.preventDefault();
      choose(options[current]);
      return true;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setDismissed(token?.start ?? null);
      return true;
    }
    return false;
  };

  return {
    open,
    fieldProps: { onSelect: track, onKeyUp: track, onClick: track, onFocus: track },
    onKeyDown,
    /** Call from the field's onChange with the new caret. */
    onChange: (event: SyntheticEvent<Field>) => {
      track(event);
      setActive(0);
      setDismissed(null);
    },
    list: {
      options,
      active: current,
      trigger: token?.trigger ?? '@',
      onHover: setActive,
      onChoose: choose,
      field,
      start: token?.start ?? 0,
    },
    close: () => setDismissed(token?.start ?? null),
  };
}
