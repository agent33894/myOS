import { BrowserWindow, Notification, shell } from 'electron';
import { spawn } from 'child_process';
import { statSync } from 'fs';
import { DomainError } from '../errors';
import { resolveInWorkspace } from '../workspace/paths';

/** Show a workspace file in the system file manager (folders open directly). */
export async function reveal(path: string): Promise<void> {
  const target = resolveInWorkspace(path);
  if (statSync(target, { throwIfNoEntry: false })?.isDirectory()) await shell.openPath(target);
  else shell.showItemInFolder(target);
}

export async function openExternal(url: string): Promise<void> {
  if (!/^https?:\/\/\S+$/i.test(url)) throw new DomainError('INVALID', 'Only http and https links open externally.');
  await shell.openExternal(url);
}

/** Open a workspace Markdown file in the user's default editor. */
export async function openInEditor(path: string): Promise<void> {
  if (!path.toLowerCase().endsWith('.md')) throw new DomainError('INVALID', 'Only Markdown files open in an editor.');
  const target = resolveInWorkspace(path);
  if (process.platform === 'linux' && (await openWithGio(target))) return;
  const error = await shell.openPath(target);
  if (error) throw new DomainError('INTERNAL', error);
}

/**
 * xdg-open outside GNOME/KDE sniffs content, so frontmatter makes notes look
 * like text/plain and it can start a terminal editor with no terminal (and
 * never return). gio matches `.md` to text/markdown and handles Terminal=true.
 */
function openWithGio(path: string): Promise<boolean> {
  return new Promise((done) => {
    const child = spawn('gio', ['open', path], { detached: true, stdio: 'ignore' });
    child.once('error', () => done(false));
    child.once('spawn', () => {
      child.unref();
      done(true);
    });
  });
}

export function notify(options: { title: string; body: string }, window: BrowserWindow | null): boolean {
  if (!Notification.isSupported()) return false;
  const notification = new Notification({ title: options.title, body: options.body });
  notification.on('click', () => {
    if (window?.isMinimized()) window.restore();
    window?.focus();
  });
  notification.show();
  return true;
}
