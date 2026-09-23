export const isMac = /Mac/i.test(navigator.platform);

export const primaryModifier = isMac ? '⌘' : 'Ctrl+';
export const primaryModifierKey = isMac ? '⌘' : 'Ctrl';
