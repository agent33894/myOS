import { useMemo } from 'react';

/**
 * Word-count garnish along the bottom of a writing surface. Shared by the
 * artifact workspace canvas and the Living Page pane.
 */
export default function EditorialFooter({ content }: { content: string }) {
  const stats = useMemo(() => {
    const words = content.split(/\s+/).filter((item) => item.length > 0).length;
    return {
      words,
      chars: content.length,
      minutes: Math.max(1, Math.ceil(words / 200)),
    };
  }, [content]);

  return (
    <div className="chronicle-editor-footer">
      <span>
        {content.trim()
          ? `${stats.words} words · ${stats.chars} characters · ~${stats.minutes} min read`
          : 'Begin writing…'}
      </span>
      <span>Autosave</span>
    </div>
  );
}
