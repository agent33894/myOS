import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

// Source mode wears the design tokens, so it follows light and dark (and the
// accent) without a theme of its own. Colors are CSS variables only.

const soft = (color: string, amount: number) => `color-mix(in oklch, ${color} ${amount}%, transparent)`;

const chrome = EditorView.theme({
  '&': {
    color: 'var(--text)',
    backgroundColor: 'transparent',
    fontSize: 'var(--text-sm)',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    lineHeight: '1.8',
    // Source shows the characters as typed: `<=` stays two characters, not a ligature.
    fontVariantLigatures: 'none',
    overflow: 'visible',
  },
  '.cm-content': {
    padding: '0 0 6rem',
    caretColor: 'var(--accent)',
  },
  '.cm-line': { padding: '0' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
  '.cm-selectionBackground': { backgroundColor: soft('var(--accent)', 16) },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': { backgroundColor: soft('var(--accent)', 24) },
  '.cm-activeLine': { backgroundColor: 'transparent' },
  '&.cm-focused .cm-activeLine': { backgroundColor: soft('var(--text)', 3) },
  '.cm-selectionMatch': { backgroundColor: soft('var(--accent)', 10) },
  '.cm-matchingBracket, .cm-nonmatchingBracket': { backgroundColor: 'transparent', outline: `1px solid ${soft('var(--text)', 20)}` },
  '.cm-searchMatch': { backgroundColor: 'var(--warning-soft)', borderRadius: '2px' },
  '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: soft('var(--warning)', 40) },

  // Checkboxes in task lines are clickable; checked lines step back.
  '.cm-task-box': { cursor: 'pointer', color: 'var(--accent-text)', borderRadius: '4px' },
  '.cm-task-box:hover': { backgroundColor: 'var(--accent-soft)' },
  '.cm-task-done': { color: 'var(--text-tertiary)' },

  // Panels (find, Vim's command line) and tooltips (link suggestions) float like menus.
  '.cm-panels': { backgroundColor: 'var(--canvas)', color: 'var(--text)', zIndex: 'var(--z-sticky)' },
  '.cm-panels-bottom': { borderTop: '1px solid var(--border)' },
  '.cm-panel.cm-search': {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 0',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-sm)',
  },
  '.cm-panel.cm-search br': { display: 'none' },
  '.cm-panel.cm-search label': { display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' },
  '.cm-panel.cm-search [name=close]': { color: 'var(--text-tertiary)', fontSize: 'var(--text-md)', right: '0' },
  '.cm-textfield': {
    height: '28px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--raised)',
    color: 'var(--text)',
    padding: '0 8px',
    fontSize: 'var(--text-sm)',
  },
  '.cm-textfield:focus': { outline: 'none', borderColor: 'var(--accent)' },
  '.cm-button': {
    height: '28px',
    backgroundImage: 'none',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    padding: '0 8px',
    fontSize: 'var(--text-sm)',
  },
  '.cm-button:hover': { backgroundColor: soft('var(--text)', 6), color: 'var(--text)' },
  '.cm-vim-panel': { padding: '2px 0', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' },
  '.cm-vim-panel input': { color: 'var(--text)', fontFamily: 'var(--font-mono)' },
  '.cm-fat-cursor': { backgroundColor: soft('var(--accent)', 45), outline: 'none', color: 'var(--text)' },
  '&:not(.cm-focused) .cm-fat-cursor': { backgroundColor: 'transparent', outline: `1px solid ${soft('var(--accent)', 60)}` },
  '.cm-tooltip': {
    backgroundColor: 'var(--overlay)',
    color: 'var(--text)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-overlay)',
    overflow: 'hidden',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul': { fontFamily: 'var(--font-sans)', padding: '4px', maxHeight: '18rem' },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li': { borderRadius: 'var(--radius-sm)', padding: '4px 8px', lineHeight: '1.5' },
  '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: soft('var(--text)', 6), color: 'var(--text)' },
  '.cm-completionLabel': { fontSize: 'var(--text-base)' },
  '.cm-completionDetail': { marginLeft: '12px', fontStyle: 'normal', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' },
  '.cm-completionMatchedText': { textDecoration: 'none', color: 'var(--accent-text)', fontWeight: '600' },
});

const highlight = HighlightStyle.define([
  // Markdown
  { tag: t.heading, color: 'var(--text)', fontWeight: '600' },
  { tag: t.heading1, color: 'var(--text)', fontWeight: '700' },
  { tag: t.strong, fontWeight: '600' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through', color: 'var(--text-tertiary)' },
  { tag: [t.link, t.url], color: 'var(--accent-text)' },
  { tag: t.quote, color: 'var(--text-secondary)', fontStyle: 'italic' },
  { tag: [t.processingInstruction, t.contentSeparator, t.labelName], color: 'var(--text-tertiary)' },
  { tag: t.list, color: 'var(--text)' },
  { tag: t.monospace, color: 'var(--text-secondary)' },
  { tag: t.meta, color: 'var(--text-tertiary)' },
  // Code in fences
  { tag: [t.keyword, t.modifier, t.operatorKeyword, t.controlKeyword], color: 'var(--accent-text)' },
  { tag: [t.string, t.special(t.string), t.regexp], color: 'var(--success)' },
  { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--warning)' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--text-tertiary)', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'var(--text)', fontWeight: '500' },
  { tag: [t.typeName, t.className, t.namespace], color: 'var(--accent-text)' },
  { tag: [t.propertyName, t.attributeName], color: 'var(--text-secondary)' },
  { tag: t.tagName, color: 'var(--danger)' },
  { tag: t.invalid, color: 'var(--danger)' },
]);

/** The design-token theme and syntax colors for source mode. */
export const sourceTheme = [chrome, syntaxHighlighting(highlight)];
