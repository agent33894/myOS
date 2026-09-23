import { describe, expect, it } from 'vitest';
import {
  getDefaultSettings,
  getStorableSettings,
  normalizeStoredSettings,
} from './settingsPersistence';

describe('settings persistence', () => {
  it.each([
    ['invalid theme', { themeMode: 'sepia' }, 'themeMode', 'system'],
    ['non-boolean accent follow', { followSystemAccent: 'yes' }, 'followSystemAccent', true],
  ])('migrates %s to its current default', (_label, input, key, expected) => {
    expect(normalizeStoredSettings(input)[key as keyof ReturnType<typeof getDefaultSettings>]).toBe(expected);
  });

  it('preserves valid legacy values and boolean false', () => {
    expect(normalizeStoredSettings({
      themeMode: 'dark',
      showCompletedTasks: true,
      enableAutoSave: false,
    })).toMatchObject({
      themeMode: 'dark',
      showCompletedTasks: true,
      enableAutoSave: false,
    });
  });

  it('serializes only stored fields', () => {
    expect(getStorableSettings({ ...getDefaultSettings(), transient: true } as never)).not.toHaveProperty('transient');
  });
});
