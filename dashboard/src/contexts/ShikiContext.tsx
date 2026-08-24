import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import type { Highlighter } from 'shiki';

interface ShikiContextType {
  highlighter: Highlighter | null;
  isLoading: boolean;
  error: Error | null;
  ensureHighlighter: () => void;
}

const ShikiContext = createContext<ShikiContextType>({
  highlighter: null,
  isLoading: false,
  error: null,
  ensureHighlighter: () => {},
});

const ESSENTIAL_LANGUAGES = [
  'javascript', 'typescript', 'tsx', 'jsx',
  'python', 'bash', 'json', 'yaml', 'markdown',
  'html', 'css', 'sql'
];

const THEMES = ['github-dark', 'github-light'];

export function ShikiProvider({ children }: { children: ReactNode }) {
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const initStartedRef = useRef(false);

  const ensureHighlighter = useCallback(() => {
    if (initStartedRef.current || highlighter) {
      return;
    }
    initStartedRef.current = true;
    setIsLoading(true);

    // Dynamic import keeps the shiki chunk off the critical startup path;
    // it only loads when a code block actually renders.
    import('shiki')
      .then(({ createHighlighter }) =>
        createHighlighter({
          themes: THEMES,
          langs: ESSENTIAL_LANGUAGES,
        }),
      )
      .then((hl) => {
        setHighlighter(hl);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to load highlighter'));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [highlighter]);

  return <ShikiContext.Provider value={{ highlighter, isLoading, error, ensureHighlighter }}>{children}</ShikiContext.Provider>;
}

export function useShikiHighlighter() {
  const context = useContext(ShikiContext);

  useEffect(() => {
    context.ensureHighlighter();
  }, [context.ensureHighlighter]);

  return context;
}
