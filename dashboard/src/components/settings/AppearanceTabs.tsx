import { useSettingsStore } from '../../store/settings';
import { Button } from '../ui/button';
import { SegmentedControl } from '../../ui';
import { AccentPicker } from './AccentPicker';

export default function AppearanceTabs() {
  const { themeMode, setThemeMode, readingFont, setReadingFont } = useSettingsStore();

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
          <h3 className="chronicle-settings-section-title">Reading font</h3>
          <p className="chronicle-settings-section-desc">The typeface for the body of your notes</p>
        </div>
        <div className="chronicle-settings-section-body">
          <SegmentedControl
            aria-label="Reading font"
            className="max-w-xs"
            value={readingFont}
            onValueChange={setReadingFont}
            options={[
              { value: 'sans', label: 'Sans' },
              { value: 'serif', label: 'Serif' },
            ]}
          />
        </div>
      </section>

      <section className="chronicle-settings-section">
        <div className="chronicle-settings-section-header">
          <h3 className="chronicle-settings-section-title">Accent</h3>
          <p className="chronicle-settings-section-desc">
            Used for selection, links, and focus. Hover a color to preview it.
          </p>
        </div>
        <div className="chronicle-settings-section-body">
          <AccentPicker />
        </div>
      </section>
    </div>
  );
}
