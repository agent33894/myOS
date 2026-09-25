const COPIED = [
  'boxSizing',
  'width',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontFeatureSettings',
  'letterSpacing',
  'lineHeight',
  'textIndent',
  'textTransform',
  'wordSpacing',
  'tabSize',
] as const;

/**
 * Where character `index` of a text field sits on screen, measured with an
 * invisible copy of the field. Lets a suggestion list open under the `@`
 * being typed instead of under the whole field.
 */
export function caretRect(field: HTMLInputElement | HTMLTextAreaElement, index: number): DOMRect {
  const box = field.getBoundingClientRect();
  const style = window.getComputedStyle(field);
  const mirror = document.createElement('div');
  for (const key of COPIED) mirror.style[key] = style[key];
  const multiline = field instanceof HTMLTextAreaElement;
  Object.assign(mirror.style, {
    position: 'fixed',
    top: `${box.top}px`,
    left: `${box.left}px`,
    visibility: 'hidden',
    whiteSpace: multiline ? 'pre-wrap' : 'pre',
    overflowWrap: multiline ? 'break-word' : 'normal',
  });
  mirror.textContent = field.value.slice(0, index);
  const marker = document.createElement('span');
  marker.textContent = field.value.slice(index) || '.';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const rect = marker.getClientRects()[0] ?? marker.getBoundingClientRect();
  const lineHeight = parseFloat(style.lineHeight) || rect.height;
  mirror.remove();
  const left = Math.min(rect.left - field.scrollLeft, box.right);
  return new DOMRect(left, rect.top - field.scrollTop, 1, lineHeight);
}
