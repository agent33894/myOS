import { useRef, type KeyboardEvent } from 'react';
import { Check, Monitor, Plus } from 'lucide-react';
import { ACCENTS, isHexColor, resolveAccent, SYSTEM_ACCENT } from '@shared/design-system/accents';
import { useSystemAccent } from '../../app/useSystemAccent';
import { setAccentPreview, updateSettings, useSettings } from '../../store/settings';
import { Button, Icon, Tooltip, cn } from '../../ui';

interface Option {
  value: string;
  name: string;
}

const swatch =
  'relative size-8 rounded-full p-0 text-accent-on transition-transform duration-fast ease-out hover:scale-110 focus-visible:outline-offset-2';

/** Accent swatches: hover previews across the app, click or arrow keys choose. */
export function AccentPicker() {
  const accent = useSettings((state) => state.accent);
  const preview = useSettings((state) => state.accentPreview);
  const setAccent = (next: string) => {
    setAccentPreview(null);
    void updateSettings({ accent: next });
  };
  const setPreview = setAccentPreview;
  const systemAccent = useSystemAccent();
  const groupRef = useRef<HTMLDivElement>(null);

  const selected = resolveAccent(accent, systemAccent);
  const shown = resolveAccent(preview ?? accent, systemAccent);
  const custom = isHexColor(selected.choice) ? selected.hex : null;
  const options: Option[] = [
    ...(systemAccent ? [{ value: SYSTEM_ACCENT, name: 'Match desktop theme' }] : []),
    ...ACCENTS.map(({ id, name }) => ({ value: id, name })),
  ];

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = options[(index + step + options.length) % options.length];
    setAccent(next.value);
    groupRef.current?.querySelector<HTMLElement>(`[data-accent="${next.value}"]`)?.focus();
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={groupRef}
        role="radiogroup"
        aria-label="Accent color"
        className="flex flex-wrap items-center gap-3"
        onMouseLeave={() => setPreview(null)}
      >
        {options.map((option, index) => {
          const checked = option.value === selected.choice;
          return (
            <Tooltip key={option.value} content={option.name}>
              <Button
                variant="ghost"
                role="radio"
                aria-checked={checked}
                aria-label={option.name}
                data-accent={option.value}
                tabIndex={checked || (!options.some((item) => item.value === selected.choice) && index === 0) ? 0 : -1}
                className={cn(swatch, 'hover:bg-transparent', checked && 'ring-2 ring-text/30 ring-offset-2 ring-offset-raised')}
                style={{ background: resolveAccent(option.value, systemAccent).hex }}
                onMouseEnter={() => setPreview(option.value)}
                onClick={() => setAccent(option.value)}
                onKeyDown={(event) => onKeyDown(event, index)}
              >
                {option.value === SYSTEM_ACCENT && !checked ? <Icon icon={Monitor} size="sm" /> : null}
                {checked ? <Icon icon={Check} size="sm" /> : null}
              </Button>
            </Tooltip>
          );
        })}
        <Tooltip content="Custom color">
          <label
            className={cn(
              swatch,
              'grid cursor-pointer place-items-center focus-within:outline focus-within:outline-2 focus-within:outline-focus',
              custom ? 'ring-2 ring-text/30 ring-offset-2 ring-offset-raised' : 'border border-dashed border-border-strong text-text-tertiary',
            )}
            style={custom ? { background: custom } : undefined}
          >
            <input
              type="color"
              aria-label="Custom accent color"
              className="sr-only"
              value={(custom ?? shown.hex).toLowerCase()}
              onChange={(event) => setAccent(event.target.value.toLowerCase())}
            />
            <Icon icon={custom ? Check : Plus} size="sm" />
          </label>
        </Tooltip>
      </div>
      <p className="text-sm text-text-secondary" aria-live="polite">
        {shown.name}
        {shown.name === 'Custom' ? <span className="ml-2 font-mono text-xs text-text-tertiary">{shown.hex}</span> : null}
      </p>
    </div>
  );
}
