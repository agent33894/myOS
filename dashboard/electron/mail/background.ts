import { app, Menu, Tray, nativeImage } from 'electron';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { MailConfig } from '../../shared/mail/types';

/**
 * Always-on mail: with "Keep checking when myOS is closed", closing the
 * window leaves myOS in the tray, still checking. "Start at login" launches
 * it straight into the tray (`myos --background`).
 */

interface TrayActions {
  open: () => void;
  check: () => void;
  quit: () => void;
}

let tray: Tray | null = null;
let keepRunning = false;
let label = 'Mail is ready';
let actions: TrayActions | null = null;

/** Closing the last window leaves myOS running for mail. */
export const mailKeepsRunning = () => keepRunning;

function iconPath(): string {
  const packaged = join(process.resourcesPath, 'icon.png');
  return existsSync(packaged) ? packaged : join(app.getAppPath(), 'build', 'icon.png');
}

function menu(): Menu {
  return Menu.buildFromTemplate([
    { label, enabled: false },
    { type: 'separator' },
    { label: 'Open myOS', click: () => actions?.open() },
    { label: 'Check mail now', click: () => actions?.check() },
    { type: 'separator' },
    { label: 'Quit myOS', click: () => actions?.quit() },
  ]);
}

function showTray(): void {
  if (tray) return;
  const image = nativeImage.createFromPath(iconPath()).resize({ width: process.platform === 'darwin' ? 18 : 22, quality: 'best' });
  try {
    tray = new Tray(image);
  } catch (error) {
    console.warn('[mail] No tray on this desktop:', (error as Error).message);
    return;
  }
  tray.setToolTip('myOS · Mail');
  tray.setContextMenu(menu());
  tray.on('click', () => actions?.open());
}

function hideTray(): void {
  tray?.destroy();
  tray = null;
}

/** The first line of the tray menu: "3 need you · checked 10:42". */
export function setTrayStatus(text: string): void {
  label = text;
  tray?.setContextMenu(menu());
  tray?.setToolTip(`myOS · ${text}`);
}

function autostartEntry(): string {
  const configHome = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
  return join(configHome, 'autostart', 'myos-mail.desktop');
}

function setLoginItem(enabled: boolean): void {
  if (!app.isPackaged) return;
  if (process.platform === 'darwin') {
    app.setLoginItemSettings({ openAtLogin: enabled, args: ['--background'] });
    return;
  }
  if (process.platform !== 'linux') return;
  const entry = autostartEntry();
  if (!enabled) {
    rmSync(entry, { force: true });
    return;
  }
  const executable = process.env.APPIMAGE || process.execPath;
  mkdirSync(join(entry, '..'), { recursive: true });
  writeFileSync(
    entry,
    ['[Desktop Entry]', 'Type=Application', 'Name=myOS Mail', 'Comment=Keep myOS checking mail', `Exec="${executable}" --background`, 'Icon=myos', 'Terminal=false', 'X-GNOME-Autostart-enabled=true', ''].join('\n'),
  );
}

export function configureBackground(config: MailConfig, hasAccounts: boolean, next: TrayActions): void {
  actions = next;
  keepRunning = config.background && hasAccounts;
  if (keepRunning) showTray();
  else hideTray();
  try {
    setLoginItem(config.startAtLogin && hasAccounts);
  } catch (error) {
    console.warn('[mail] Could not update the login item:', (error as Error).message);
  }
}
