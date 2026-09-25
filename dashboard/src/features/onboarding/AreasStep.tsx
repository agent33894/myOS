import { useState } from 'react';
import { Check } from 'lucide-react';
import { Domain } from '@shared/types';
import { useSettingsStore } from '../../store/settings';
import { Button, Icon, SegmentedControl, cn } from '../../ui';
import { AREA_LIST, areaInfo } from '../files/areas';

interface AreaCardProps {
  area: (typeof AREA_LIST)[number];
  selected: boolean;
  onToggle: () => void;
}

function AreaCard({ area, selected, onToggle }: AreaCardProps) {
  return (
    <Button
      variant="ghost"
      aria-pressed={selected}
      data-testid={`onboarding-area-${area.value}`}
      onClick={onToggle}
      className={cn(
        'relative h-auto w-full items-start justify-start gap-4 whitespace-normal rounded-lg p-4 text-left shadow-raised transition-all duration-base',
        selected
          ? 'bg-accent-soft text-text ring-1 ring-accent hover:bg-accent-soft'
          : 'bg-raised text-text hover:-translate-y-0.5 hover:bg-raised hover:shadow-overlay',
      )}
    >
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-full transition-colors duration-base',
          selected ? 'bg-accent text-accent-on' : 'bg-accent-soft text-accent-text',
        )}
      >
        <Icon icon={area.icon} size="lg" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 pr-6">
        <span className="text-md font-semibold text-text">{area.label}</span>
        <span className="text-sm font-normal text-text-secondary">{area.hint}</span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'absolute right-3 top-3 grid size-5 place-items-center rounded-full transition-all duration-base',
          selected ? 'animate-check-pop bg-accent text-accent-on' : 'border border-border-strong',
        )}
      >
        {selected ? <Icon icon={Check} size="sm" /> : null}
      </span>
    </Button>
  );
}

/**
 * The second onboarding step: which areas this space is for, and which one new
 * things go to. Both only decide where files are kept; Settings changes them later.
 */
export function AreasStep({ onDone }: { onDone: () => void }) {
  const setSetting = useSettingsStore((state) => state.setSetting);
  // Most people start with these two; the rest are one click away.
  const [used, setUsed] = useState<Domain[]>([Domain.WORK, Domain.PERSONAL]);
  const [fallback, setFallback] = useState<Domain>(Domain.PERSONAL);

  const toggle = (area: Domain) => {
    const next = used.includes(area) ? used.filter((value) => value !== area) : [...used, area];
    if (!next.length) return;
    const ordered = AREA_LIST.map((entry) => entry.value).filter((value) => next.includes(value));
    setUsed(ordered);
    if (!ordered.includes(fallback)) setFallback(ordered[0]);
  };

  const finish = () => {
    setSetting('usedAreas', used);
    setSetting('defaultArea', fallback);
    onDone();
  };

  return (
    <section aria-labelledby="areas-title" className="flex w-full max-w-2xl animate-dialog-in flex-col items-center text-center">
      <p className="text-sm font-medium text-accent-text">One more thing</p>
      <h1 id="areas-title" className="mt-2 text-2xl font-semibold">
        What’s this space for?
      </h1>
      <p className="mt-3 max-w-md text-md text-text-secondary">
        Pick the areas you’ll use. They keep your files in tidy folders, and you can change them any time.
      </p>

      <div role="group" aria-label="Areas you use" className="mt-8 grid w-full gap-3 sm:grid-cols-2">
        {AREA_LIST.map((area) => (
          <AreaCard key={area.value} area={area} selected={used.includes(area.value)} onToggle={() => toggle(area.value)} />
        ))}
      </div>

      <div className="mt-8 flex w-full flex-col items-center gap-3">
        <span className="text-sm font-medium text-text-secondary">
          Default for new things
        </span>
        <SegmentedControl
          aria-label="Default for new things"
          options={used.map((value) => ({ value, label: areaInfo(value).label }))}
          value={fallback}
          onValueChange={setFallback}
        />
        <p className="text-xs text-text-tertiary">New notes and tasks go here unless their project has an area.</p>
      </div>

      <div className="mt-10 flex items-center gap-2">
        <Button variant="ghost" onClick={onDone}>
          Skip for now
        </Button>
        <Button variant="primary" data-testid="onboarding-areas-continue" onClick={finish} className="px-5">
          Continue
        </Button>
      </div>
    </section>
  );
}
