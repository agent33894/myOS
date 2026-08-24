import { useMemo } from 'react';
import { useShikiHighlighter } from '../../contexts/ShikiContext';
import { cn } from '../../lib/utils';

interface ShikiCodeProps {
  code: string;
  language?: string;
  className?: string;
}

export default function ShikiCode({ code, language = 'text', className }: ShikiCodeProps) {
  const { highlighter, isLoading } = useShikiHighlighter();

  const highlighted = useMemo(() => {
    if (!highlighter || !code) return null;

    try {
      // Normalize language name
      const lang = language.toLowerCase().replace('language-', '');
      const supportedLang = highlighter.getLoadedLanguages().includes(lang) ? lang : 'text';

      return highlighter.codeToHtml(code, {
        lang: supportedLang,
        theme: 'github-dark',
      });
    } catch {
      return null;
    }
  }, [highlighter, code, language]);

  // Loading or error fallback - no background since parent handles it
  if (isLoading || !highlighted) {
    return (
      <code className={cn(
        "block p-3 text-xs font-mono overflow-x-auto whitespace-pre",
        className
      )}>
        {code}
      </code>
    );
  }

  return (
    <div
      className={cn(
        "shiki-wrapper text-xs overflow-x-auto [&>pre]:p-3 [&>pre]:m-0 [&>pre]:bg-transparent",
        "[&>pre]:rounded-none",
        className
      )}
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}
