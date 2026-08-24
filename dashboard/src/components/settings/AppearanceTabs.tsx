import { useSettingsStore } from '../../store/settings';
import { useAccentColor } from '../../hooks/useAccentColor';
import { Button } from '../ui/button'

export default function AppearanceTabs() {
  const { themeMode, setThemeMode } = useSettingsStore();
  const { pantoneColor } = useAccentColor();

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
          <p className="chronicle-settings-section-desc">The single stamp ink Chronicle uses for active states</p>
        </div>
        <div className="chronicle-settings-section-body">
          <div className="flex items-center gap-4">
            <span
              className="h-10 w-10 flex-shrink-0 rounded-sm border border-border"
              style={{ backgroundColor: `rgb(${pantoneColor.rgb})` }}
              aria-hidden="true"
            />
            <div>
              <h3 className="font-serif text-base text-foreground">Vermilion</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Chronicle uses a single stamp ink for active states and emphasis. It follows the light and dark themes automatically.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
