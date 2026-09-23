import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommandSurface } from '../ui/CommandSurface';
import { paletteRoutes } from '../../app/routes';
import { useArtifactsStore } from '../../store/artifacts';
import { useCommandPaletteActions } from '../../store/selectors';
import { toArtifactNavigationUrl } from '../../features/artifact-route/routeContract';
import { cn } from '../../lib/utils';
import { primaryModifier } from '../../utils/platform';

type PaletteResult = {
  id: string;
  group: 'Artifacts' | 'Commands';
  type: string;
  title: string;
  subtitle?: string;
  run: () => void;
};

export default function CommandPalette() {
  const navigate = useNavigate();
  const artifacts = useArtifactsStore((state) => state.artifacts);
  const { closeCommandPalette } = useCommandPaletteActions();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build the lowercase haystacks once per vault change, not per keystroke.
  const haystacks = useMemo(
    () =>
      artifacts.map(
        (artifact) => `${artifact.title} ${artifact.type} ${artifact.tags.join(' ')}`.toLowerCase(),
      ),
    [artifacts],
  );

  const results = useMemo<PaletteResult[]>(() => {
    const needle = query.trim().toLowerCase();
    const actions: PaletteResult[] = [
      {
        id: 'command-new-project',
        group: 'Commands' as const,
        type: 'Command',
        title: 'New project…',
        subtitle: '/projects',
        run: () => navigate('/projects?create=1'),
      },
    ].filter((action) => !needle || action.title.toLowerCase().includes(needle));
    const routes = paletteRoutes
      .filter((route) => !needle || route.label.toLowerCase().includes(needle))
      .map((route) => ({
        id: `route-${route.id}`,
        group: 'Commands' as const,
        type: 'Command',
        title: route.label,
        subtitle: route.shortcut ? `${primaryModifier}${route.shortcut}` : route.path,
        run: () => navigate(route.path),
      }));
    const matches = (needle ? artifacts.filter((_, index) => haystacks[index].includes(needle)) : [])
      .slice(0, 12)
      .map((artifact) => ({
        id: `artifact-${artifact.id}`,
        group: 'Artifacts' as const,
        type: artifact.type,
        title: artifact.title,
        subtitle: artifact.project || artifact.domain,
        run: () => navigate(toArtifactNavigationUrl(artifact)),
      }));
    return [...matches, ...actions, ...routes].slice(0, 16);
  }, [artifacts, haystacks, navigate, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    setSelected(0);
  }, [query]);
  const run = (result: PaletteResult | undefined) => {
    if (!result) return;
    result.run();
    closeCommandPalette();
  };

  return (
    <CommandSurface title="Command palette" onClose={closeCommandPalette} labelledBy="command-palette-title">
      <label id="command-palette-title" htmlFor="command-palette-input" className="sr-only">
        Search artifacts and commands
      </label>
      <input
        id="command-palette-input"
        ref={inputRef}
        role="combobox"
        aria-expanded="true"
        aria-controls="command-palette-results"
        aria-activedescendant={results[selected]?.id}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') closeCommandPalette();
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelected((value) => Math.min(results.length - 1, value + 1));
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelected((value) => Math.max(0, value - 1));
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            run(results[selected]);
          }
        }}
        className="chronicle-command-input"
        placeholder="Search artifacts, run commands…"
      />
      <div id="command-palette-results" role="listbox" className="chronicle-command-results custom-scrollbar">
        {results.map((result, index) => (
          <div key={result.id}>
            {index === 0 || results[index - 1].group !== result.group ? (
              <div className="chronicle-command-group">{result.group}</div>
            ) : null}
            <button
              id={result.id}
              role="option"
              aria-selected={index === selected}
              className={cn('chronicle-command-row', index === selected && 'is-selected')}
              onMouseEnter={() => setSelected(index)}
              onClick={() => run(result)}
            >
              <span className="chronicle-command-type">{result.type}</span>
              <span className="chronicle-command-title">{result.title}</span>
              <span className="chronicle-command-subtitle">{result.subtitle}</span>
            </button>
          </div>
        ))}
        {results.length === 0 ? <p className="chronicle-empty-row">No matches.</p> : null}
      </div>
    </CommandSurface>
  );
}
