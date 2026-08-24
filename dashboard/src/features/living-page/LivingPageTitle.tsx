import { useLayoutEffect, useRef } from 'react';

interface LivingPageTitleProps {
  value: string;
  onChange: (next: string) => void;
}

/**
 * The editable display title. A plain input can't wrap, and Chronicle titles
 * routinely run past one line — so this is a single-logical-line textarea
 * that grows with its content (field-sizing isn't in this Chromium yet).
 */
export default function LivingPageTitle({ value, onChange }: LivingPageTitleProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const fit = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useLayoutEffect(fit, [value]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el?.parentElement) return;
    const observer = new ResizeObserver(fit);
    observer.observe(el.parentElement);
    return () => observer.disconnect();
  }, []);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      onChange={(event) => onChange(event.target.value.replace(/\n/g, ' '))}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.preventDefault();
      }}
      placeholder="Untitled artifact"
      className="chronicle-editor-title chronicle-living-title"
      aria-label="Artifact title"
    />
  );
}
