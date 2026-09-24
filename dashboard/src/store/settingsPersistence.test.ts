import { describe, expect, it } from 'vitest';
import {
  getDefaultSettings,
  getStorableSettings,
  normalizeStoredSettings,
} from './settingsPersistence';

describe('settings persistence', () => {
  it.each([
    ['invalid theme', { themeMode: 'sepia' }, 'themeMode', 'system'],
    ['unknown accent', { accent: 'vermilion' }, 'accent', 'iris'],
    ['retired Pantone accent', { accent: 'ultra-violet' }, 'accent', 'iris'],
    ['invalid reading font', { readingFont: 'comic' }, 'readingFont', 'sans'],
    ['legacy accent follow flag', { followSystemAccent: true }, 'accent', 'iris'],
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

  it('accepts curated ids, the system accent, and custom hex colors', () => {
    expect(normalizeStoredSettings({ accent: 'teal' }).accent).toBe('teal');
    expect(normalizeStoredSettings({ accent: 'system' }).accent).toBe('system');
    expect(normalizeStoredSettings({ accent: '#A1B2C3' }).accent).toBe('#a1b2c3');
    expect(normalizeStoredSettings({ accent: '#abc' }).accent).toBe('iris');
  });

  it('serializes only stored fields', () => {
    expect(getStorableSettings({ ...getDefaultSettings(), transient: true } as never)).not.toHaveProperty('transient');
  });
});
