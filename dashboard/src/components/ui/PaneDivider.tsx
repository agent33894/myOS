import { useCallback } from 'react';

interface PaneDividerProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Negate drag/arrow direction for panes tracked from the right edge. */
  invert?: boolean;
}

export function PaneDivider({ label, value, min, max, onChange, invert = false }: PaneDividerProps) {
  const direction = invert ? -1 : 1;
  const clamp = useCallback((next: number) => Math.min(max, Math.max(min, next)), [max, min]);
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const startX = event.clientX;
    const startValue = value;
    event.currentTarget.setPointerCapture(event.pointerId);
    const move = (moveEvent: PointerEvent) => onChange(clamp(startValue + direction * (moveEvent.clientX - startX)));
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };

  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      className="chronicle-divider"
      onPointerDown={onPointerDown}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') onChange(clamp(value - 12 * direction));
        if (event.key === 'ArrowRight') onChange(clamp(value + 12 * direction));
      }}
    />
  );
}
