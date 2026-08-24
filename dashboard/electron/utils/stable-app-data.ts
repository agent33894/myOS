import { app } from 'electron';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const STABLE_APP_SUPPORT_DIR = 'myOS';

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function getStableAppDataPath(): string {
  return join(app.getPath('appData'), STABLE_APP_SUPPORT_DIR);
}

export function ensureStableAppDataPath(): string {
  const appDataPath = getStableAppDataPath();
  if (!existsSync(appDataPath)) {
    mkdirSync(appDataPath, { recursive: true });
  }
  return appDataPath;
}

export function getLegacyAppDataPaths(): string[] {
  const appDataRoot = app.getPath('appData');
  const currentUserDataPath = app.getPath('userData');
  return unique([
    currentUserDataPath,
    join(appDataRoot, 'myos-markdown'),
    join(appDataRoot, 'myOS Markdown'),
  ]).filter((candidate) => candidate !== getStableAppDataPath());
}
