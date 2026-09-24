import { Monitor, Moon, Sun } from 'lucide-react';
import { useSettingsStore } from '../../store/settings';
import { SegmentedControl } from '../../ui';
import { AccentPicker } from './AccentPicker';
import { SettingsGroup, SettingsRow } from './SettingsGroup';

export function AppearanceSettings() {
  const themeMode = useSettingsStore((state) => state.themeMode);
  const setThemeMode = useSettingsStore((state) => state.setThemeMode);
  const readingFont = useSettingsStore((state) => state.readingFont);
  const setReadingFont = useSettingsStore((state) => state.setReadingFont);

  return (
    <>
      <SettingsGroup title="Theme">
        <SettingsRow
          label="Appearance"
          description="Follow your system, or pick one."
          control={
            <SegmentedControl
              aria-label="Appearance"
              className="w-80"
              value={themeMode}
              onValueChange={setThemeMode}
              options={[
                { value: 'system', label: 'System', icon: Monitor },
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
              ]}
            />
          }
        />
        <SettingsRow label="Accent" description="Used for selection, buttons, and focus. Hover a color to preview it.">
          <AccentPicker />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Reading">
        <SettingsRow
          label="Reading font"
          description="The typeface for the body of your notes."
          control={
            <SegmentedControl
              aria-label="Reading font"
              className="w-48"
              value={readingFont}
              onValueChange={setReadingFont}
              options={[
                { value: 'sans', label: 'Sans' },
                { value: 'serif', label: 'Serif' },
              ]}
            />
          }
        >
          <div aria-hidden="true" className="rounded-md bg-sunken px-5 py-4">
            <p className="text-lg font-semibold text-text">A quiet morning</p>
            <p className="mt-1 font-reading text-md text-text-secondary">
              Write the way you think. Notes stay plain text, so they read the same here, in any editor, and years
              from now.
            </p>
          </div>
        </SettingsRow>
      </SettingsGroup>
    </>
  );
}
