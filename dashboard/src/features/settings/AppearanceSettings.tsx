import { Monitor, Moon, Sun } from 'lucide-react';
import { updateSettings, useSettings } from '../../store/settings';
import { SegmentedControl } from '../../ui';
import { AccentPicker } from './AccentPicker';
import { SettingsGroup, SettingsRow } from './SettingsGroup';

export function AppearanceSettings() {
  const theme = useSettings((state) => state.theme);
  const readingFont = useSettings((state) => state.readingFont);

  return (
    <>
      <SettingsGroup title="Theme">
        <SettingsRow
          label="Appearance"
          description="Follow your system, or pick one."
          control={
            <SegmentedControl
              aria-label="Appearance"
              value={theme}
              onValueChange={(next) => void updateSettings({ theme: next })}
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
              value={readingFont}
              onValueChange={(next) => void updateSettings({ readingFont: next })}
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
