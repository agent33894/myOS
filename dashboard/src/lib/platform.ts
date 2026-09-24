export const isMac = /Mac/i.test(navigator.platform);
export const isLinux = /Linux/i.test(navigator.platform);

/**
 * The app's command modifier: ⌘ on macOS, Ctrl elsewhere. On Linux the Meta
 * key is Super, which belongs to the window manager — myOS never claims it.
 */
export function hasPrimaryModifier(event: Pick<KeyboardEvent, 'metaKey' | 'ctrlKey'>): boolean {
  return isMac ? event.metaKey : event.ctrlKey;
}
