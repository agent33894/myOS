import { app } from 'electron';
import { join } from 'path';

/**
 * `~/.config/myOS Next` (Linux) or `~/Library/Application Support/myOS Next`
 * (macOS): its own folder, so myOS 3.0 installed alongside never shares
 * settings, history, or browser storage with it.
 */
export const appDataPath = (): string => join(app.getPath('appData'), 'myOS Next');
