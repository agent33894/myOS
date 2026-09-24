import { useSettingsStore } from '../../store/settings';
import { Button } from '../ui/button';
import { AccentPicker } from './AccentPicker';

export default function AppearanceTabs() {
  const { themeMode, setThemeMode } = useSettingsStore();

  return (
    <div>
      <section className="chronicle-settings-section">
        <div className="chronicle-settings-section-header">
          <h3 className="chronicle-settings-section-title">Appearance</h3>
          <p className="chronicle-settings-section-desc">Follow the system, or pin light or dark</p>
        </div>
        <div className="chronicle-settings-section-body">
          <div className="grid max-w-sm grid-cols-3 gap-2" role="radiogroup" aria-label="Appearance">
            {(['system', 'light', 'dark'] as const).map((mode) => (
              <Button
                key={mode}
                role="radio"
                aria-checked={themeMode === mode}
                variant={themeMode === mode ? 'default' : 'outline'}
                onClick={() => setThemeMode(mode)}
                className="capitalize"
              >
                {mode}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="chronicle-settings-section">
        <div className="chronicle-settings-section-header">
          <h3 className="chronicle-settings-section-title">Accent</h3>
          <p className="chronicle-settings-section-desc">
            One ink for active states, links, and focus. Hover to preview; every color is adjusted to stay legible
            on light and dark paper.
          </p>
        </div>
        <div className="chronicle-settings-section-body">
          <AccentPicker />
        </div>
      </section>
    </div>
  );
}
