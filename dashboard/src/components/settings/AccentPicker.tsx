import { useRef, type KeyboardEvent } from 'react';
import { Monitor, Plus } from 'lucide-react';
import { ACCENTS, isHexColor, resolveAccent, SYSTEM_ACCENT } from '@shared/design-system/accents';
import { useSettingsStore } from '../../store/settings';
import { useSystemAccent } from '../../hooks/useSystemAccent';
import { cn } from '../../lib/utils';

interface AccentOption {
  value: string;
  name: string;
  hex: string;
}

/**
 * Accent swatch picker. Hovering previews the accent across the whole app;
 * clicking (or arrow keys) commits it.
 */
export function AccentPicker() {
  const accent = useSettingsStore((state) => state.accent);
  const accentPreview = useSettingsStore((state) => state.accentPreview);
  const setAccent = useSettingsStore((state) => state.setAccent);
  const setAccentPreview = useSettingsStore((state) => state.setAccentPreview);
  const systemAccent = useSystemAccent();
  const groupRef = useRef<HTMLDivElement>(null);

  const selected = resolveAccent(accent, systemAccent);
  const shown = resolveAccent(accentPreview ?? accent, systemAccent);
  const paint = (value: string) => resolveAccent(value, systemAccent).hex;

  const options: AccentOption[] = [
    ...(systemAccent ? [{ value: SYSTEM_ACCENT, name: 'Desktop theme', hex: systemAccent }] : []),
    ...ACCENTS.map(({ id, name, hex }) => ({ value: id, name, hex })),
  ];
  const customHex = isHexColor(selected.choice) ? selected.hex : null;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = options[(index + step + options.length) % options.length];
    setAccent(next.value);
    groupRef.current?.querySelector<HTMLButtonElement>(`[data-accent="${next.value}"]`)?.focus();
  };

  return (
    <div className="chronicle-accent-picker">
      <div className="chronicle-accent-specimen" aria-live="polite">
        <span className="min-w-0">
          <span className="chronicle-accent-name">{shown.name}</span>
          <span className="chronicle-accent-code">{shown.hex}</span>
        </span>
      </div>

      <div
        ref={groupRef}
        role="radiogroup"
        aria-label="Accent color"
        className="chronicle-accent-grid"
        onMouseLeave={() => setAccentPreview(null)}
      >
        {options.map((option, index) => {
          const isSelected = option.value === selected.choice;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={option.name}
              title={option.name}
              data-accent={option.value}
              tabIndex={isSelected || (!options.some((item) => item.value === selected.choice) && index === 0) ? 0 : -1}
              className={cn('chronicle-accent-swatch', isSelected && 'is-selected')}
              style={{ background: paint(option.value) }}
              onMouseEnter={() => setAccentPreview(option.value)}
              onClick={() => setAccent(option.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {option.value === SYSTEM_ACCENT ? <Monitor aria-hidden="true" /> : null}
            </button>
          );
        })}
        <label
          title="Custom color"
          className={cn('chronicle-accent-swatch chronicle-accent-custom', customHex && 'is-selected')}
          style={customHex ? { background: customHex } : undefined}
        >
          <input
            type="color"
            aria-label="Custom accent color"
            className="sr-only"
            value={(customHex ?? shown.hex).toLowerCase()}
            onChange={(event) => setAccent(event.target.value.toLowerCase())}
          />
          {customHex ? null : <Plus aria-hidden="true" />}
        </label>
      </div>
    </div>
  );
}
