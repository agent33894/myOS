import { Monitor, Moon, Sun } from 'lucide-react';
import { updateSettings, useSettings } from '../../store/settings';
import { SegmentedControl } from '../../ui';
import { AccentPicker } from './AccentPicker';
import { SettingsGroup, SettingsRow } from './SettingsGroup';

/** Theme and accent. */
export function AppearanceSettings() {
  const theme = useSettings((state) => state.theme);
  return (
    <SettingsGroup title="Appearance">
      <SettingsRow
        label="Theme"
        description="Follow your system, or pick one."
        control={
          <SegmentedControl
            aria-label="Theme"
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
      <SettingsRow label="Accent" description="Used for selection, buttons, and focus, and to tint the window. Hover a color to preview it.">
        <AccentPicker />
      </SettingsRow>
    </SettingsGroup>
  );
}
